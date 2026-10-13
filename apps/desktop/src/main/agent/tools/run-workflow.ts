import { tool } from 'ai'
import { z } from 'zod'
import { getWorkflowById, createWorkflowLog, updateWorkflowLog } from '../../services/workflow-service'
import { getProfileById, updateLastUsed } from '../../services/profile-service'
import { acquireBrowserPage } from '../../browser/launcher'
import { executeVisualWorkflow, executeCodeWorkflow, type ExecutionContext } from '../../automation/engine'
import { DEFAULT_PROFILE_ID } from '../../database/init'
import type { AgentToolContext } from './types'

export function createRunWorkflowTool(ctx: AgentToolContext) {
  return tool({
    description:
      'CHẠY THẬT 1 workflow Automation đã thiết kế — mở/dùng browser thật, chạy node thật (bao gồm generate-image/generate-video, tốn tiền/thời gian thật), khác với propose_workflow_change (chỉ thiết kế, không chạy). Luôn cần người dùng duyệt trước khi chạy thật — không tự ý chạy khi chưa chắc chắn người dùng muốn vậy. Dùng get_workflow_state hoặc danh sách workflow đã biết trước nếu chưa chắc id. Sau khi chạy xong, đọc "logs" trong kết quả để biết chính xác đã làm gì/tạo ra gì.',
    inputSchema: z.object({
      workflowId: z.string(),
      profileId: z.string().optional().describe('Profile để chạy — bỏ trống sẽ dùng profile hiện tại của cuộc trò chuyện, hoặc profile mặc định')
    }),
    execute: async ({ workflowId, profileId }) => {
      const workflow = getWorkflowById(workflowId)
      if (!workflow) {
        return {
          ok: false,
          error: `Không tìm thấy workflow với id "${workflowId}". ĐỪNG tự đoán hay bịa 1 id khác để thử lại — lấy đúng id workflow thật rồi dùng đúng id đó.`
        }
      }

      const actualProfileId = profileId || ctx.profileId || DEFAULT_PROFILE_ID
      const profile = getProfileById(actualProfileId)
      if (!profile) {
        return { ok: false, error: `Không tìm thấy profile với id "${actualProfileId}".` }
      }

      const log = createWorkflowLog(workflowId, actualProfileId)
      const execCtx: ExecutionContext = {
        page: null as any,
        context: null as any,
        profileId: actualProfileId,
        workflowId,
        workflowLogId: log.id,
        variables: {},
        logs: [],
        aborted: false,
        depth: 0
      }

      try {
        const { context, page } = await acquireBrowserPage(profile)
        updateLastUsed(actualProfileId)
        execCtx.context = context
        execCtx.page = page

        for (const v of workflow.variables) {
          execCtx.variables[v.name] = v.defaultValue
        }

        if (workflow.mode === 'visual') {
          await executeVisualWorkflow(workflow, execCtx)
        } else {
          await executeCodeWorkflow(workflow.code, execCtx)
        }

        updateWorkflowLog(log.id, 'completed', JSON.stringify(execCtx.logs))
        return { ok: true, logId: log.id, status: 'completed', logs: execCtx.logs }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        execCtx.logs.push({ timestamp: new Date().toISOString(), level: 'error', message })
        updateWorkflowLog(log.id, 'error', JSON.stringify(execCtx.logs))
        return { ok: false, error: message, logId: log.id, logs: execCtx.logs }
      }
    }
  })
}
