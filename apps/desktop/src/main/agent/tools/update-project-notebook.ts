import { tool } from 'ai'
import { z } from 'zod'
import { getProjectById, updateProject } from '../../services/project-service'
import { createResourceFromText, updateResourceContent } from '../../services/library-service'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: project data is global, not scoped to this run
export function createUpdateProjectNotebookTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Cập nhật "sổ tay dự án" (nhân vật, mạch truyện, văn phong) — gọi sau khi hoàn thành 1 task quan trọng (vd xong 1 tập phim) để các task SAU biết ngữ cảnh qua get_project_context mà không cần đọc lại toàn bộ nội dung cũ. Viết TÓM TẮT/cập nhật phần liên quan, KHÔNG dán nguyên văn kịch bản đầy đủ của tập đó — sổ tay phải luôn gọn, không phình theo số tập.',
    inputSchema: z.object({
      projectId: z.string(),
      content: z.string().describe('nội dung đầy đủ của sổ tay sau khi cập nhật — THAY THẾ toàn bộ, không phải chỉ phần thêm vào')
    }),
    execute: async ({ projectId, content }) => {
      const project = getProjectById(projectId)
      if (!project) {
        return {
          ok: false,
          error: `Không tìm thấy project với id "${projectId}". ĐỪNG tự đoán hay bịa 1 id khác để thử lại — gọi list_projects để lấy đúng danh sách project và id thật, rồi dùng đúng id đó.`
        }
      }

      try {
        if (project.notebookResourceId) {
          updateResourceContent(project.notebookResourceId, content)
          return { ok: true, resourceId: project.notebookResourceId }
        }

        const resource = createResourceFromText({
          name: 'Sổ tay dự án',
          kind: 'prompt-template',
          extension: 'txt',
          text: content,
          parentId: project.libraryFolderId,
          objectType: 'manual'
        })
        updateProject(projectId, { notebookResourceId: resource.id })
        return { ok: true, resourceId: resource.id }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  })
}
