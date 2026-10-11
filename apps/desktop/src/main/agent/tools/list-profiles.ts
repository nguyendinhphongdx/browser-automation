import { tool } from 'ai'
import { z } from 'zod'
import { getAllProfiles } from '../../services/profile-service'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: profile data is global, not scoped to this run
export function createListProfilesTool(ctx: AgentToolContext) {
  return tool({
    description: 'Liệt kê mọi profile (hồ sơ trình duyệt chống dấu vết) hiện có kèm id/tên/loại trình duyệt/tag/thư mục.',
    inputSchema: z.object({}),
    execute: async () => {
      const profiles = getAllProfiles().map((p) => ({
        id: p.id,
        name: p.name,
        browserType: p.browserType,
        tags: p.tags,
        folder: p.folder
      }))
      return { ok: true, profiles }
    }
  })
}
