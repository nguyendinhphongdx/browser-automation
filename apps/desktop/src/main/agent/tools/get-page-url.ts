import { tool } from 'ai'
import { z } from 'zod'
import type { AgentToolContext } from './types'

export function createGetPageUrlTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Lấy URL và tiêu đề trang hiện tại đang mở trong browser của profile này. Gọi tool này trước khi đề xuất workflow để biết chính xác đang ở trang nào.',
    inputSchema: z.object({}),
    execute: async () => {
      if (!ctx.page) {
        return { ok: false, error: 'Chưa có browser nào đang mở cho profile này. Gọi start_browser trước.' }
      }
      try {
        return { ok: true, url: ctx.page.url(), title: await ctx.page.title() }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  })
}
