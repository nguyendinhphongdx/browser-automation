import { tool } from 'ai'
import { z } from 'zod'
import { getProjectById, getTaskById, createTask } from '../../services/project-service'
import { getResourceById } from '../../services/library-service'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: project data is global, not scoped to this run
export function createCreateTaskTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Tạo 1 task mới trong 1 project (ADR-0004) — vd "Viết kịch bản tập 3", "Tạo nhân vật phụ". Task có thể lồng vào 1 task khác qua "parentTaskId" (vd "Dựng tập 3" chứa "Viết kịch bản"/"Tạo ảnh nhân vật"/"Dựng video"). Khi được giao 1 mục tiêu lớn, CHỦ ĐỘNG chia thành nhiều task riêng theo đúng "kind" (ADR-0009) thay vì gộp chung — xem quy tắc phân rã trong hướng dẫn chung. "outputFolderId" là nơi output của task này sẽ lưu vào trong Thư viện — bỏ trống để dùng gốc project, dùng list_resources/get_project_context để biết đúng id thư mục nếu muốn chỉ định.',
    inputSchema: z.object({
      projectId: z.string(),
      title: z.string(),
      kind: z
        .enum(['script', 'image', 'video', 'automation', 'other'])
        .optional()
        .describe('bản chất công việc — script: viết kịch bản/lời thoại; image: tạo ảnh; video: dựng cảnh/video; automation: crawl/tải tài nguyên web; other: việc khác. Mặc định "other".'),
      parentTaskId: z.string().optional().describe('id task cha, nếu task này là 1 phần của việc lớn hơn'),
      sequence: z.number().optional().describe('thứ tự — vd số tập'),
      outputFolderId: z.string().optional().describe('id thư mục trong Thư viện để lưu output; bỏ trống = gốc project'),
      notes: z.string().optional()
    }),
    execute: async ({ projectId, title, kind, parentTaskId, sequence, outputFolderId, notes }) => {
      try {
        const project = getProjectById(projectId)
        if (!project) {
          return {
            ok: false,
            error: `Không tìm thấy project với id "${projectId}". ĐỪNG tự đoán hay bịa 1 id khác để thử lại — gọi list_projects để lấy đúng danh sách project và id thật, rồi dùng đúng id đó.`
          }
        }

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

        const task = createTask({ projectId, title, kind, parentTaskId, sequence, outputFolderId, notes })
        return { ok: true, id: task.id, title: task.title, status: task.status, kind: task.kind }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  })
}
