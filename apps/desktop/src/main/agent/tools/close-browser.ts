import { tool } from 'ai'
import { z } from 'zod'
import { closeBrowser, isBrowserRunning } from '../../browser/launcher'
import type { AgentToolContext } from './types'

export function createCloseBrowserTool(ctx: AgentToolContext) {
  return tool({
    description: 'Đóng trình duyệt đang mở cho profile này. Chỉ gọi khi người dùng yêu cầu rõ ràng đóng browser.',
    inputSchema: z.object({}),
    execute: async () => {
      if (!isBrowserRunning(ctx.profileId)) {
        return { ok: true, message: 'Không có trình duyệt nào đang mở để đóng.' }
      }
      try {
        await closeBrowser(ctx.profileId)
        ctx.page = null
        return { ok: true, message: 'Đã đóng trình duyệt.' }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  })
}
