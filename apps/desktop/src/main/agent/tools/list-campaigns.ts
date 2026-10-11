import { tool } from 'ai'
import { z } from 'zod'
import { getAllCampaigns, getCampaignRuns } from '../../services/campaign-service'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: campaign data is global, not scoped to this run
export function createListCampaignsTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Liệt kê mọi chiến dịch (Campaign) hiện có kèm id, trạng thái, số profile/workflow, và lần chạy gần nhất. KHÔNG có tool nào tự chạy/dừng 1 campaign thật — chỉ xem được thông tin, người dùng tự bấm Chạy/Dừng trên UI.',
    inputSchema: z.object({}),
    execute: async () => {
      const campaigns = getAllCampaigns().map((c) => {
        const lastRun = getCampaignRuns(c.id)[0]
        return {
          id: c.id,
          name: c.name,
          description: c.description,
          status: c.status,
          profileCount: c.profileIds.length,
          workflowCount: c.workflowIds.length,
          lastRunStatus: lastRun?.status ?? null,
          lastRunAt: lastRun?.startedAt ?? null
        }
      })
      return { ok: true, campaigns }
    }
  })
}
