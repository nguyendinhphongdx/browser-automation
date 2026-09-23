import { tool } from 'ai'
import { z } from 'zod'
import type { AgentToolContext } from './types'

// Raw DOM HTML is exactly the kind of thing that silently blows a model's
// context window if left uncapped — truncate hard rather than trust the
// caller to ask for a narrow-enough selector.
const MAX_HTML_LENGTH = 20_000

export function createGetPageHtmlTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Đọc HTML thật của trang đang mở trong browser của profile này — toàn bộ document, hoặc chỉ 1 phần tử theo CSS selector. Dùng để biết cấu trúc DOM thật (tên class, id, thuộc tính) trước khi đề xuất selector cho workflow, thay vì đoán.',
    inputSchema: z.object({
      selector: z
        .string()
        .optional()
        .describe('CSS selector để chỉ lấy HTML của phần tử đó; bỏ trống để lấy toàn bộ document')
    }),
    execute: async ({ selector }) => {
      if (!ctx.page) {
        return {
          ok: false,
          error: 'Chưa có browser nào đang mở cho profile này. Yêu cầu người dùng mở browser trước.'
        }
      }
      try {
        const html = selector
          ? await ctx.page.locator(selector).first().innerHTML()
          : await ctx.page.content()
        const truncated = html.length > MAX_HTML_LENGTH
        return {
          ok: true,
          html: truncated ? html.slice(0, MAX_HTML_LENGTH) : html,
          truncated
        }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  })
}
