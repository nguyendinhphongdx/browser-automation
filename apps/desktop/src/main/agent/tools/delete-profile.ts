import { tool } from 'ai'
import { z } from 'zod'
import { getProfileById, deleteProfile } from '../../services/profile-service'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: profile data is global, not scoped to this run
export function createDeleteProfileTool(ctx: AgentToolContext) {
  return tool({
    description:
      'XOÁ VĨNH VIỄN 1 profile — xoá cả bản ghi DB VÀ toàn bộ thư mục dữ liệu trình duyệt trên đĩa (cookie/localStorage/session...) của profile đó, không có thùng rác/hoàn tác. Đây là hành động rủi ro cao nhất trong nhóm tool quản lý profile/resource. Luôn cần người dùng duyệt trước khi chạy thật — không tự ý xoá khi chưa chắc chắn người dùng muốn vậy.',
    inputSchema: z.object({ id: z.string() }),
    execute: async ({ id }) => {
      try {
        const existing = getProfileById(id)
        if (!existing) return { ok: false, error: `Không tìm thấy profile "${id}"` }
        const deleted = deleteProfile(id)
        return deleted ? { ok: true, id, name: existing.name } : { ok: false, error: `Xoá "${id}" thất bại` }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  })
}
