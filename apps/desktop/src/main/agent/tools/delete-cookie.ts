import { tool } from 'ai'
import { z } from 'zod'
import { getCookieById, deleteCookie } from '../../services/cookie-service'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: cookie data is global, not scoped to this run
export function createDeleteCookieTool(ctx: AgentToolContext) {
  return tool({
    description:
      'XOÁ VĨNH VIỄN 1 bộ cookie đã lưu — không có thùng rác/hoàn tác. Luôn cần người dùng duyệt trước khi chạy thật — không tự ý xoá khi chưa chắc chắn người dùng muốn vậy.',
    inputSchema: z.object({ id: z.string() }),
    execute: async ({ id }) => {
      try {
        const existing = getCookieById(id)
        if (!existing) return { ok: false, error: `Không tìm thấy cookie "${id}"` }
        const deleted = deleteCookie(id)
        return deleted ? { ok: true, id, name: existing.name } : { ok: false, error: `Xoá "${id}" thất bại` }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  })
}
