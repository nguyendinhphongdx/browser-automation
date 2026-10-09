import { tool } from 'ai'
import { z } from 'zod'
import type { AgentToolContext } from './types'

export function createTakeScreenshotTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Chụp ảnh màn hình trang đang mở, hiện trực tiếp cho người dùng xem trong giao diện. Bạn (model) chỉ nhận lại kích thước ảnh, không phải nội dung ảnh — tool này chủ yếu để NGƯỜI DÙNG xác nhận trực quan, không phải để bạn "đọc" ảnh.',
    inputSchema: z.object({
      fullPage: z
        .boolean()
        .optional()
        .default(false)
        .describe('true để chụp toàn trang kể cả phần cuộn, false để chỉ chụp viewport hiện tại')
    }),
    execute: async ({ fullPage }) => {
      if (!ctx.page) {
        return { ok: false, error: 'Chưa có browser nào đang mở cho profile này. Gọi start_browser trước.' }
      }
      try {
        const buffer = await ctx.page.screenshot({ type: 'jpeg', quality: 70, fullPage })
        ctx.onScreenshot?.(`data:image/jpeg;base64,${buffer.toString('base64')}`)

        const viewport = ctx.page.viewportSize()
        return {
          ok: true,
          byteSize: buffer.length,
          width: viewport?.width,
          height: viewport?.height
        }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  })
}
