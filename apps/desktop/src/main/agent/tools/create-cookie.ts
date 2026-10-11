import { tool } from 'ai'
import { z } from 'zod'
import { createCookie } from '../../services/cookie-service'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: cookie data is global, not scoped to this run
export function createCreateCookieTool(ctx: AgentToolContext) {
  return tool({
    description: 'Lưu 1 bộ cookie mới — "cookies" là nội dung JSON cookie do người dùng cung cấp trực tiếp (không tự bịa).',
    inputSchema: z.object({
      name: z.string(),
      domain: z.string(),
      cookies: z.string().describe('JSON string nội dung cookie, do người dùng cung cấp'),
      profileId: z.string().nullable().optional(),
      notes: z.string().optional()
    }),
    execute: async ({ name, domain, cookies, profileId, notes }) => {
      try {
        const created = createCookie({ name, domain, cookies, profileId, notes })
        return { ok: true, id: created.id, name: created.name }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  })
}
