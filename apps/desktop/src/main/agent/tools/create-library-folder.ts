import { tool } from 'ai'
import { z } from 'zod'
import { createFolder, getResourceById } from '../../services/library-service'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: library is global, not scoped to this run
export function createCreateLibraryFolderTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Tạo 1 thư mục mới trong Thư viện — dùng để gom nhóm nhiều resource liên quan (vd 1 bộ ảnh nhân vật, kết quả của 1 lần crawl) trước khi lưu từng cái bằng save_resource với "parentId" là id thư mục vừa tạo. Không tạo lại thư mục đã tồn tại — dùng list_resources trước để kiểm tra nếu không chắc.',
    inputSchema: z.object({
      name: z.string().describe('tên thư mục'),
      parentId: z.string().optional().describe('id thư mục cha muốn tạo bên trong; bỏ trống = tạo ở gốc thư viện')
    }),
    execute: async ({ name, parentId }) => {
      try {
        if (parentId) {
          const parent = getResourceById(parentId)
          if (!parent) return { ok: false, error: `Không tìm thấy thư mục cha "${parentId}"` }
          if (parent.kind !== 'folder') return { ok: false, error: `Resource "${parentId}" không phải thư mục` }
        }
        const folder = createFolder(name, parentId ?? null, 'agent')
        return { ok: true, id: folder.id, name: folder.name }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  })
}
