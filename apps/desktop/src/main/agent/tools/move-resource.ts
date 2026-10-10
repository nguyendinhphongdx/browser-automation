import { tool } from 'ai'
import { z } from 'zod'
import { getResourceById, moveResource } from '../../services/library-service'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: library is global, not scoped to this run
export function createMoveResourceTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Di chuyển 1 resource/thư mục sang 1 thư mục cha khác trong Thư viện. Dùng list_resources trước để biết đúng id. Bỏ trống "newParentId" để đưa resource ra gốc thư viện.',
    inputSchema: z.object({
      id: z.string().describe('id resource/thư mục cần di chuyển'),
      newParentId: z.string().optional().describe('id thư mục cha mới; bỏ trống = đưa ra gốc thư viện')
    }),
    execute: async ({ id, newParentId }) => {
      try {
        const existing = getResourceById(id)
        if (!existing) return { ok: false, error: `Không tìm thấy resource "${id}"` }

        if (newParentId) {
          const parent = getResourceById(newParentId)
          if (!parent) return { ok: false, error: `Không tìm thấy thư mục đích "${newParentId}"` }
          if (parent.kind !== 'folder') return { ok: false, error: `Resource "${newParentId}" không phải thư mục` }
        }

        const moved = moveResource(id, newParentId ?? null)
        return { ok: true, id: moved!.id, name: moved!.name, parentId: moved!.parentId }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  })
}
