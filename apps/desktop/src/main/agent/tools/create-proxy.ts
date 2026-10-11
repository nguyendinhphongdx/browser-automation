import { tool } from 'ai'
import { z } from 'zod'
import { createProxy } from '../../services/proxy-service'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: proxy data is global, not scoped to this run
export function createCreateProxyTool(ctx: AgentToolContext) {
  return tool({
    description: 'Thêm 1 proxy mới — username/password (nếu có) do người dùng cung cấp trực tiếp (không tự bịa).',
    inputSchema: z.object({
      name: z.string(),
      type: z.enum(['http', 'https', 'socks4', 'socks5']),
      host: z.string(),
      port: z.number(),
      username: z.string().optional(),
      password: z.string().optional(),
      country: z.string().optional()
    }),
    execute: async (input) => {
      try {
        const created = createProxy(input)
        return { ok: true, id: created.id, name: created.name }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  })
}
