import { tool } from 'ai'
import { z } from 'zod'
import { getAllCookies } from '../../services/cookie-service'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: cookie data is global, not scoped to this run
export function createListCookiesTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Liệt kê các bộ cookie đã lưu kèm id/tên/domain/profile gắn với — KHÔNG trả nội dung cookie thật (dữ liệu đăng nhập nhạy cảm), chỉ dùng để tra id trước khi update/delete.',
    inputSchema: z.object({}),
    execute: async () => {
      const cookies = getAllCookies().map((c) => ({ id: c.id, name: c.name, domain: c.domain, profileId: c.profileId, notes: c.notes }))
      return { ok: true, cookies }
    }
  })
}
