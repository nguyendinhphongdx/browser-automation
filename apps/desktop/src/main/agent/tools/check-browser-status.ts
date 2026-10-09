import { tool } from 'ai'
import { z } from 'zod'
import { getActiveBrowserContext } from '../../browser/launcher'
import type { AgentToolContext } from './types'

/**
 * Read-only check — lets the model decide whether it needs to call
 * start_browser before anything else, instead of a browser being launched
 * silently as a side effect of the chat panel just being open.
 */
export function createCheckBrowserStatusTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Kiểm tra profile này hiện có trình duyệt nào đang mở không, không tự mở gì cả. Gọi tool này đầu tiên khi cần biết trạng thái trước khi quyết định có cần gọi start_browser hay không.',
    inputSchema: z.object({}),
    execute: async () => {
      const active = getActiveBrowserContext(ctx.profileId)
      if (!active) {
        ctx.page = null
        return { ok: true, running: false }
      }
      const pages = active.context.pages().filter((p) => !p.isClosed())
      const page = pages[pages.length - 1] ?? null
      ctx.page = page
      if (!page) {
        return { ok: true, running: true, url: null }
      }
      return { ok: true, running: true, url: page.url(), title: await page.title() }
    }
  })
}
