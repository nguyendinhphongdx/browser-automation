import { tool } from 'ai'
import { z } from 'zod'
import { getProjectById, getTasksByProject } from '../../services/project-service'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: project data is global, not scoped to this run
export function createListProjectTasksTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Liệt kê toàn bộ task của 1 project (ADR-0004) kèm trạng thái, task cha, thứ tự. Dùng khi cần tra lại 1 task cụ thể (vd lấy id để đổi trạng thái/di chuyển) mà không cần toàn bộ ngữ cảnh nặng của get_project_context.',
    inputSchema: z.object({ projectId: z.string() }),
    execute: async ({ projectId }) => {
      const project = getProjectById(projectId)
      if (!project) {
        return {
          ok: false,
          error: `Không tìm thấy project với id "${projectId}". ĐỪNG tự đoán hay bịa 1 id khác để thử lại — gọi list_projects để lấy đúng danh sách project và id thật, rồi dùng đúng id đó.`
        }
      }

      const tasks = getTasksByProject(projectId).map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        kind: t.kind,
        parentTaskId: t.parentTaskId,
        sequence: t.sequence,
        outputFolderId: t.outputFolderId
      }))

      return { ok: true, tasks }
    }
  })
}
