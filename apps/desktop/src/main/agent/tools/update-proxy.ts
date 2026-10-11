import { tool } from 'ai'
import { z } from 'zod'
import { getProxyById, updateProxy } from '../../services/proxy-service'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: proxy data is global, not scoped to this run
export function createUpdateProxyTool(ctx: AgentToolContext) {
  return tool({
    description: 'Sửa thông tin 1 proxy đã lưu — username/password (nếu sửa) do người dùng cung cấp trực tiếp.',
    inputSchema: z.object({
      id: z.string(),
      name: z.string().optional(),
      type: z.enum(['http', 'https', 'socks4', 'socks5']).optional(),
      host: z.string().optional(),
      port: z.number().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
      country: z.string().optional()
    }),
    execute: async ({ id, ...input }) => {
      try {
        const existing = getProxyById(id)
        if (!existing) return { ok: false, error: `Không tìm thấy proxy "${id}"` }
        const updated = updateProxy(id, input)
        return { ok: true, id: updated!.id, name: updated!.name }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  })
}
