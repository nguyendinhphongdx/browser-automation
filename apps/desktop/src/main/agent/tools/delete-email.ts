import { tool } from 'ai'
import { z } from 'zod'
import { getEmailById, deleteEmail } from '../../services/email-service'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: email data is global, not scoped to this run
export function createDeleteEmailTool(ctx: AgentToolContext) {
  return tool({
    description:
      'XOÁ VĨNH VIỄN 1 email account đã lưu — không có thùng rác/hoàn tác. Luôn cần người dùng duyệt trước khi chạy thật — không tự ý xoá khi chưa chắc chắn người dùng muốn vậy.',
    inputSchema: z.object({ id: z.string() }),
    execute: async ({ id }) => {
      try {
        const existing = getEmailById(id)
        if (!existing) return { ok: false, error: `Không tìm thấy email "${id}"` }
        const deleted = deleteEmail(id)
        return deleted ? { ok: true, id, email: existing.email } : { ok: false, error: `Xoá "${id}" thất bại` }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  })
}
