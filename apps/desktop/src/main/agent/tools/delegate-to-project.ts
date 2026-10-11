import { tool } from 'ai'
import { z } from 'zod'
import { agentService } from '../agent-service'
import { getProjectById } from '../../services/project-service'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: this tool builds its OWN inert context for the sub-agent, not the caller's
export function createDelegateToProjectTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Giao 1 task cho trợ lý domain "project" tự làm (ADR-0007) — vd nhiều bước liên quan tới 1 project (tạo vài task, cập nhật sổ tay...) gói trong 1 lần gọi. Mọi tool Project/Task tự ghi DB ngay, không cần bước lưu riêng. Dùng list_projects trước nếu chưa biết id.',
    inputSchema: z.object({
      projectId: z.string(),
      task: z.string().describe('mô tả việc cần làm trong project này, càng cụ thể càng tốt')
    }),
    execute: async ({ projectId, task }) => {
      const project = getProjectById(projectId)
      if (!project) return { ok: false, error: `Không tìm thấy project "${projectId}"` }

      const subContext: AgentToolContext = {
        page: null,
        profileId: '',
        workflowSnapshot: { nodes: [], edges: [] },
        nodeDefinitions: [],
        onScreenshot: () => {},
        onResourcePreview: () => {}
      }

      const result = await agentService.runSubAgent({ domain: 'project', toolContext: subContext, task })
      return { ok: result.ok, result: result.text }
    }
  })
}
