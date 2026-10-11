import { tool } from 'ai'
import { z } from 'zod'
import { getAllProxies } from '../../services/proxy-service'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: proxy data is global, not scoped to this run
export function createListProxiesTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Liệt kê các proxy đã lưu kèm id/tên/loại/host/port/trạng thái — KHÔNG trả username/password (dữ liệu xác thực nhạy cảm), chỉ dùng để tra id trước khi update/delete/check_proxy.',
    inputSchema: z.object({}),
    execute: async () => {
      const proxies = getAllProxies().map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        host: p.host,
        port: p.port,
        country: p.country,
        status: p.status
      }))
      return { ok: true, proxies }
    }
  })
}
