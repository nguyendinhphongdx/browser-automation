import { tool } from 'ai'
import { z } from 'zod'
import { createEmail } from '../../services/email-service'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: email data is global, not scoped to this run
export function createCreateEmailTool(ctx: AgentToolContext) {
  return tool({
    description: 'Thêm 1 email account mới — password do người dùng cung cấp trực tiếp (không tự bịa).',
    inputSchema: z.object({
      email: z.string(),
      password: z.string(),
      recoveryEmail: z.string().optional(),
      phone: z.string().optional(),
      provider: z.enum(['gmail', 'outlook', 'yahoo', 'other']).optional(),
      status: z.enum(['active', 'locked', 'verify_needed', 'unknown']).optional(),
      notes: z.string().optional(),
      profileId: z.string().nullable().optional()
    }),
    execute: async (input) => {
      try {
        const created = createEmail(input)
        return { ok: true, id: created.id, email: created.email }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  })
}
