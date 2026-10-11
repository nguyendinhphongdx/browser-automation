import { tool } from 'ai'
import { z } from 'zod'
import { getProjectById, getTasksByProject, getProjectFolderTree } from '../../services/project-service'
import { getResourceTextContent } from '../../services/library-service'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: project data is global, not scoped to this run
export function createGetProjectContextTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Lấy TOÀN BỘ ngữ cảnh của 1 project (ADR-0004) — sổ tay dự án (nhân vật/mạch truyện/văn phong đã tích luỹ), cây thư mục THẬT hiện có trong project, và danh sách task kèm trạng thái. LUÔN gọi tool này ĐẦU TIÊN trước khi làm bất kỳ việc gì thuộc 1 project cụ thể (vd viết kịch bản tập mới, tạo nhân vật) — đừng tự đoán cấu trúc hay giả định đã biết nội dung trước đó, cấu trúc thư mục của mỗi project không cố định.',
    inputSchema: z.object({ projectId: z.string() }),
    execute: async ({ projectId }) => {
      const project = getProjectById(projectId)
      if (!project) return { ok: false, error: `Không tìm thấy project "${projectId}"` }

      const notebook = project.notebookResourceId ? (getResourceTextContent(project.notebookResourceId) ?? '') : ''
      const folderTree = getProjectFolderTree(project.libraryFolderId)
      const tasks = getTasksByProject(projectId).map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        parentTaskId: t.parentTaskId,
        sequence: t.sequence
      }))

      return {
        ok: true,
        project: { id: project.id, name: project.name, description: project.description, rootFolderId: project.libraryFolderId },
        notebook,
        folderTree,
        tasks
      }
    }
  })
}
