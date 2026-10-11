import { tool } from 'ai'
import { z } from 'zod'
import { getAllEmails } from '../../services/email-service'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: email data is global, not scoped to this run
export function createListEmailsTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Liệt kê các email account đã lưu kèm id/địa chỉ/provider/trạng thái/profile gắn với — KHÔNG trả password (dữ liệu xác thực nhạy cảm), chỉ dùng để tra id trước khi update/delete.',
    inputSchema: z.object({}),
    execute: async () => {
      const emails = getAllEmails().map((e) => ({
        id: e.id,
        email: e.email,
        provider: e.provider,
        status: e.status,
        profileId: e.profileId
      }))
      return { ok: true, emails }
    }
  })
}
