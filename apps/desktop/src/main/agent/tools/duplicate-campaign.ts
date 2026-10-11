import { tool } from 'ai'
import { z } from 'zod'
import { duplicateCampaign } from '../../services/campaign-service'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: campaign data is global, not scoped to this run
export function createDuplicateCampaignTool(ctx: AgentToolContext) {
  return tool({
    description: 'Nhân bản 1 chiến dịch đã có thành 1 bản mới (giữ nguyên cấu hình profile/workflow/execution).',
    inputSchema: z.object({ id: z.string() }),
    execute: async ({ id }) => {
      try {
        const copy = duplicateCampaign(id)
        if (!copy) return { ok: false, error: `Không tìm thấy campaign "${id}"` }
        return { ok: true, id: copy.id, name: copy.name }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  })
}
