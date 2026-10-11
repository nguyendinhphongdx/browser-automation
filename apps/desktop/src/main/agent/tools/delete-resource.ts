import { tool } from 'ai'
import { z } from 'zod'
import { getResourceById, deleteResource } from '../../services/library-service'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: library is global, not scoped to this run
export function createDeleteResourceTool(ctx: AgentToolContext) {
  return tool({
    description:
      'XOÁ VĨNH VIỄN 1 resource hoặc thư mục rỗng khỏi Thư viện — không có thùng rác/hoàn tác. Thư mục còn chứa resource bên trong sẽ bị từ chối xoá (dọn/di chuyển con trước bằng move_resource). Luôn cần người dùng duyệt trước khi chạy thật (xem domains.ts\'s AGENT_DOMAINS) — không tự ý xoá khi chưa chắc chắn người dùng muốn vậy.',
    inputSchema: z.object({
      id: z.string().describe('id resource/thư mục cần xoá')
    }),
    execute: async ({ id }) => {
      try {
        const existing = getResourceById(id)
        if (!existing) return { ok: false, error: `Không tìm thấy resource "${id}"` }

        const deleted = deleteResource(id)
        return deleted
          ? { ok: true, id, name: existing.name }
          : { ok: false, error: `Xoá "${id}" thất bại` }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  })
}
