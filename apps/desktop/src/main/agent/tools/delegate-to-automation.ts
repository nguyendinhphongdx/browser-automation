import { tool } from 'ai'
import { z } from 'zod'
import { agentService } from '../agent-service'
import { getWorkflowById, updateWorkflow } from '../../services/workflow-service'
import { NODE_DEFINITIONS } from '../../automation/node-definitions'
import { applyWorkflowPatch, type WorkflowChangePatch } from '../../../shared/agent/apply-workflow-patch'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: this tool builds its OWN inert context for the sub-agent, not the caller's
export function createDelegateToAutomationTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Giao 1 task cho trợ lý domain "automation" tự dựng/sửa workflow (ADR-0007) — vd "thêm bước tải ảnh vào workflow X". Sub-agent làm việc trên bản ĐÃ LƯU trong DB (không phải canvas đang mở ở trang Automation) và lưu thẳng kết quả vào DB nếu hợp lệ — nếu trang đó đang mở với thay đổi CHƯA lưu, kết quả có thể bị đè khi người dùng bấm Lưu sau. Sub-agent không có trình duyệt thật và không làm được việc cần duyệt (vd run_js, xoá). Dùng list_workflows trước nếu chưa biết id.',
    inputSchema: z.object({
      workflowId: z.string(),
      task: z.string().describe('mô tả việc cần làm với workflow này, càng cụ thể càng tốt')
    }),
    execute: async ({ workflowId, task }) => {
      const workflow = getWorkflowById(workflowId)
      if (!workflow) return { ok: false, error: `Không tìm thấy workflow "${workflowId}"` }

      const subContext: AgentToolContext = {
        page: null,
        profileId: '',
        workflowId,
        workflowSnapshot: { nodes: workflow.nodes, edges: workflow.edges, mode: workflow.mode, code: workflow.code },
        nodeDefinitions: NODE_DEFINITIONS,
        onScreenshot: () => {},
        onResourcePreview: () => {}
      }

      let persistError: string | null = null
      const result = await agentService.runSubAgent({
        domain: 'automation',
        toolContext: subContext,
        task,
        onToolResult: (toolName, resultText, ok) => {
          if (!ok || persistError) return
          if (!['propose_workflow_change', 'propose_destructive_workflow_change', 'propose_code_change'].includes(toolName)) return
          try {
            const parsed = JSON.parse(resultText) as { patch?: unknown }
            if (!parsed.patch || typeof parsed.patch !== 'object') return
            const current = getWorkflowById(workflowId)
            if (!current) {
              persistError = `Workflow "${workflowId}" đã bị xoá trong lúc sub-agent đang chạy`
              return
            }
            const applied = applyWorkflowPatch(parsed.patch as WorkflowChangePatch, NODE_DEFINITIONS, {
              nodes: current.nodes,
              edges: current.edges
            })
            if (!applied.ok) {
              persistError = applied.errors?.join('; ') ?? 'patch không hợp lệ'
              return
            }
            if (applied.code !== undefined) {
              updateWorkflow(workflowId, { code: applied.code })
            } else {
              updateWorkflow(workflowId, { nodes: applied.nodes, edges: applied.edges })
            }
          } catch {
            // Không phải JSON, hoặc không đúng shape {patch} — không có gì để áp.
          }
        }
      })

      if (persistError) {
        return { ok: false, error: `Sub-agent đề xuất thay đổi nhưng không lưu được: ${persistError}`, subAgentText: result.text }
      }
      return { ok: result.ok, result: result.text }
    }
  })
}
