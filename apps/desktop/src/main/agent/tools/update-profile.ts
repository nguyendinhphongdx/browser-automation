import { tool } from 'ai'
import { z } from 'zod'
import { getProfileById, updateProfile } from '../../services/profile-service'
import type { AgentToolContext } from './types'

const BROWSER_TYPES = ['chrome', 'brave', 'edge', 'firefox', 'opera', 'vivaldi', 'chromium', 'custom'] as const

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: profile data is global, not scoped to this run
export function createUpdateProfileTool(ctx: AgentToolContext) {
  return tool({
    description: 'Sửa tên/loại trình duyệt/tag/thư mục/proxy gắn với của 1 profile đã có — đổi browserType sẽ tự sinh lại fingerprint.',
    inputSchema: z.object({
      id: z.string(),
      name: z.string().optional(),
      browserType: z.enum(BROWSER_TYPES).optional(),
      tags: z.array(z.string()).optional(),
      folder: z.string().optional(),
      notes: z.string().optional(),
      proxyId: z.string().nullable().optional()
    }),
    execute: async ({ id, ...input }) => {
      try {
        const existing = getProfileById(id)
        if (!existing) return { ok: false, error: `Không tìm thấy profile "${id}"` }
        const updated = updateProfile(id, input)
        return { ok: true, id: updated!.id, name: updated!.name }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  })
}
