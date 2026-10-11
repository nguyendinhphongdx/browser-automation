import { tool } from 'ai'
import { z } from 'zod'
import { getProxyById, checkProxy } from '../../services/proxy-service'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: proxy data is global, not scoped to this run
export function createCheckProxyTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Kiểm tra 1 proxy đã lưu còn sống không — mở 1 kết nối mạng thật tới host:port của proxy đó. Luôn cần người dùng duyệt trước khi chạy thật.',
    inputSchema: z.object({ id: z.string() }),
    execute: async ({ id }) => {
      try {
        const existing = getProxyById(id)
        if (!existing) return { ok: false, error: `Không tìm thấy proxy "${id}"` }
        const result = await checkProxy(id)
        if (!result) return { ok: false, error: `Kiểm tra proxy "${id}" thất bại` }
        return { ok: true, id: result.id, status: result.status, speed: result.speed }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  })
}
