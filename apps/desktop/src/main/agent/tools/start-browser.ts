import { tool } from 'ai'
import { z } from 'zod'
import { acquireBrowserPage } from '../../browser/launcher'
import { getProfileById } from '../../services/profile-service'
import type { AgentToolContext } from './types'

/**
 * Explicit, model-initiated browser launch — the agent used to get a
 * browser auto-launched the moment the chat panel opened, which meant
 * just opening the panel popped a real browser window even when the user
 * only wanted to ask something unrelated. Now nothing launches until the
 * model actually decides it needs one and calls this.
 */
export function createStartBrowserTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Mở trình duyệt thật cho profile này nếu chưa có (hoặc dùng lại nếu đã đang mở sẵn). Gọi tool này TRƯỚC khi dùng get_page_url/get_page_html/take_screenshot/run_js nếu check_browser_status báo chưa có browser nào đang chạy.',
    inputSchema: z.object({}),
    execute: async () => {
      const profile = getProfileById(ctx.profileId)
      if (!profile) {
        return { ok: false, error: `Profile "${ctx.profileId}" không tồn tại.` }
      }
      try {
        const { page, launchedNow } = await acquireBrowserPage(profile)
        ctx.page = page
        return {
          ok: true,
          launchedNow,
          url: page.url(),
          message: launchedNow ? 'Đã mở trình duyệt mới.' : 'Đã dùng trình duyệt đang mở sẵn.'
        }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  })
}
