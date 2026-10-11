import { tool } from 'ai'
import { z } from 'zod'
import { createCampaign } from '../../services/campaign-service'
import type { CampaignExecution } from '../../../shared/types'
import type { AgentToolContext } from './types'

// Mirror DEFAULT_EXECUTION trong renderer/stores/campaign-store.ts — AI
// hiếm khi cần cấu hình từng field nâng cao (A/B test, quota...), chỉ cần
// 1 mặc định hợp lý giống UI tạo campaign mới.
const DEFAULT_EXECUTION: CampaignExecution = {
  mode: 'parallel',
  maxConcurrent: 3,
  delayBetweenProfiles: { min: 1000, max: 5000 },
  workflowOrder: 'sequential',
  profileOrder: 'sequential',
  repeatCount: 0,
  repeatDelay: { min: 5000, max: 10000 },
  stopOnError: false,
  retryOnError: 1,
  warmUp: false,
  warmUpStep: 1,
  warmUpDelay: 10000
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: campaign data is global, not scoped to this run
export function createCreateCampaignTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Tạo 1 chiến dịch mới (chạy 1 hay nhiều workflow trên nhiều profile) — dùng get_node_catalog/list_resources nếu cần tra id workflow/profile trước. KHÔNG tự chạy campaign sau khi tạo — người dùng tự bấm Chạy trên UI.',
    inputSchema: z.object({
      name: z.string(),
      description: z.string().optional(),
      profileIds: z.array(z.string()).describe('id các profile sẽ chạy campaign này'),
      workflowIds: z.array(z.string()).describe('id các workflow sẽ chạy trong campaign này'),
      mode: z.enum(['parallel', 'sequential']).optional().describe('chạy nhiều profile cùng lúc hay lần lượt — mặc định parallel')
    }),
    execute: async ({ name, description, profileIds, workflowIds, mode }) => {
      try {
        const campaign = createCampaign({
          name,
          description,
          profileIds,
          workflowIds,
          execution: mode ? { ...DEFAULT_EXECUTION, mode } : DEFAULT_EXECUTION
        })
        return { ok: true, id: campaign.id, name: campaign.name }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  })
}
