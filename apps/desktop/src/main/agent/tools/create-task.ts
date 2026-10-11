import { tool } from 'ai'
import { z } from 'zod'
import { getProjectById, getTaskById, createTask } from '../../services/project-service'
import { getResourceById } from '../../services/library-service'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: project data is global, not scoped to this run
export function createCreateTaskTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Tạo 1 task mới trong 1 project (ADR-0004) — vd "Viết kịch bản tập 3", "Tạo nhân vật phụ". Task có thể lồng vào 1 task khác qua "parentTaskId" (vd "Dựng tập 3" chứa "Viết kịch bản"/"Tạo ảnh nhân vật"/"Dựng video"). "outputFolderId" là nơi output của task này sẽ lưu vào trong Thư viện — bỏ trống để dùng gốc project, dùng list_resources/get_project_context để biết đúng id thư mục nếu muốn chỉ định.',
    inputSchema: z.object({
      projectId: z.string(),
      title: z.string(),
      parentTaskId: z.string().optional().describe('id task cha, nếu task này là 1 phần của việc lớn hơn'),
      sequence: z.number().optional().describe('thứ tự — vd số tập'),
      outputFolderId: z.string().optional().describe('id thư mục trong Thư viện để lưu output; bỏ trống = gốc project'),
      notes: z.string().optional()
    }),
    execute: async ({ projectId, title, parentTaskId, sequence, outputFolderId, notes }) => {
      try {
        const project = getProjectById(projectId)
        if (!project) return { ok: false, error: `Không tìm thấy project "${projectId}"` }

        if (parentTaskId) {
          const parent = getTaskById(parentTaskId)
          if (!parent) return { ok: false, error: `Không tìm thấy task cha "${parentTaskId}"` }
          if (parent.projectId !== projectId) return { ok: false, error: `Task cha "${parentTaskId}" không thuộc project này` }
        }

        if (outputFolderId) {
          const folder = getResourceById(outputFolderId)
          if (!folder) return { ok: false, error: `Không tìm thấy thư mục "${outputFolderId}"` }
          if (folder.kind !== 'folder') return { ok: false, error: `Resource "${outputFolderId}" không phải thư mục` }
        }

        const task = createTask({ projectId, title, parentTaskId, sequence, outputFolderId, notes })
        return { ok: true, id: task.id, title: task.title, status: task.status }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  })
}
