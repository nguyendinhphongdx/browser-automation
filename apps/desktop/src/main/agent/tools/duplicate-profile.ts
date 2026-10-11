import { tool } from 'ai'
import { z } from 'zod'
import { duplicateProfile } from '../../services/profile-service'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: profile data is global, not scoped to this run
export function createDuplicateProfileTool(ctx: AgentToolContext) {
  return tool({
    description: 'Nhân bản 1 profile đã có thành 1 bản mới (copy cả dữ liệu trình duyệt trên đĩa — cookie/localStorage...).',
    inputSchema: z.object({ id: z.string() }),
    execute: async ({ id }) => {
      try {
        const copy = duplicateProfile(id)
        if (!copy) return { ok: false, error: `Không tìm thấy profile "${id}"` }
        return { ok: true, id: copy.id, name: copy.name }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  })
}
