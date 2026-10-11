import { tool } from 'ai'
import { z } from 'zod'
import { getEmailById, updateEmail } from '../../services/email-service'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: email data is global, not scoped to this run
export function createUpdateEmailTool(ctx: AgentToolContext) {
  return tool({
    description: 'Sửa thông tin 1 email account đã lưu — password (nếu sửa) do người dùng cung cấp trực tiếp.',
    inputSchema: z.object({
      id: z.string(),
      email: z.string().optional(),
      password: z.string().optional(),
      recoveryEmail: z.string().optional(),
      phone: z.string().optional(),
      provider: z.enum(['gmail', 'outlook', 'yahoo', 'other']).optional(),
      status: z.enum(['active', 'locked', 'verify_needed', 'unknown']).optional(),
      notes: z.string().optional(),
      profileId: z.string().nullable().optional()
    }),
    execute: async ({ id, ...input }) => {
      try {
        const existing = getEmailById(id)
        if (!existing) return { ok: false, error: `Không tìm thấy email "${id}"` }
        const updated = updateEmail(id, input)
        return { ok: true, id: updated!.id, email: updated!.email }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  })
}
