import { tool } from 'ai'
import { z } from 'zod'
import { getCampaignById, updateCampaign } from '../../services/campaign-service'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: campaign data is global, not scoped to this run
export function createUpdateCampaignTool(ctx: AgentToolContext) {
  return tool({
    description: 'Sửa tên/mô tả/danh sách profile hoặc workflow của 1 chiến dịch đã có.',
    inputSchema: z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      profileIds: z.array(z.string()).optional(),
      workflowIds: z.array(z.string()).optional()
    }),
    execute: async ({ id, ...input }) => {
      try {
        const existing = getCampaignById(id)
        if (!existing) return { ok: false, error: `Không tìm thấy campaign "${id}"` }
        const updated = updateCampaign(id, input)
        return { ok: true, id: updated!.id, name: updated!.name }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  })
}
