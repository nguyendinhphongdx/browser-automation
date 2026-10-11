import { tool } from 'ai'
import { z } from 'zod'
import { getCampaignById, deleteCampaign } from '../../services/campaign-service'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: campaign data is global, not scoped to this run
export function createDeleteCampaignTool(ctx: AgentToolContext) {
  return tool({
    description:
      'XOÁ VĨNH VIỄN 1 chiến dịch — không có thùng rác/hoàn tác. Luôn cần người dùng duyệt trước khi chạy thật (xem domains.ts\'s AGENT_DOMAINS) — không tự ý xoá khi chưa chắc chắn người dùng muốn vậy.',
    inputSchema: z.object({ id: z.string() }),
    execute: async ({ id }) => {
      try {
        const existing = getCampaignById(id)
        if (!existing) return { ok: false, error: `Không tìm thấy campaign "${id}"` }
        const deleted = deleteCampaign(id)
        return deleted ? { ok: true, id, name: existing.name } : { ok: false, error: `Xoá "${id}" thất bại` }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  })
}
