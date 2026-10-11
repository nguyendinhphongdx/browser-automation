import { tool } from 'ai'
import { z } from 'zod'
import { getCookieById, updateCookie } from '../../services/cookie-service'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: cookie data is global, not scoped to this run
export function createUpdateCookieTool(ctx: AgentToolContext) {
  return tool({
    description: 'Sửa tên/domain/profile gắn với/nội dung của 1 bộ cookie đã lưu.',
    inputSchema: z.object({
      id: z.string(),
      name: z.string().optional(),
      domain: z.string().optional(),
      cookies: z.string().optional().describe('JSON string nội dung cookie mới, do người dùng cung cấp'),
      profileId: z.string().nullable().optional(),
      notes: z.string().optional()
    }),
    execute: async ({ id, ...input }) => {
      try {
        const existing = getCookieById(id)
        if (!existing) return { ok: false, error: `Không tìm thấy cookie "${id}"` }
        const updated = updateCookie(id, input)
        return { ok: true, id: updated!.id, name: updated!.name }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  })
}
