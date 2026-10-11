import { tool } from 'ai'
import { z } from 'zod'
import { createProfile } from '../../services/profile-service'
import type { AgentToolContext } from './types'

const BROWSER_TYPES = ['chrome', 'brave', 'edge', 'firefox', 'opera', 'vivaldi', 'chromium', 'custom'] as const

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: profile data is global, not scoped to this run
export function createCreateProfileTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Tạo 1 profile trình duyệt chống dấu vết mới — tự sinh fingerprint phù hợp với browserType. Dùng list_proxies trước nếu muốn gắn sẵn 1 proxy.',
    inputSchema: z.object({
      name: z.string(),
      browserType: z.enum(BROWSER_TYPES).optional().describe('mặc định chrome nếu bỏ trống'),
      tags: z.array(z.string()).optional(),
      folder: z.string().optional(),
      notes: z.string().optional(),
      proxyId: z.string().nullable().optional()
    }),
    execute: async ({ browserType, ...input }) => {
      try {
        const created = createProfile({ ...input, browserType: browserType ?? 'chrome' })
        return { ok: true, id: created.id, name: created.name }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  })
}
