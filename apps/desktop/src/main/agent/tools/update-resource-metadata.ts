import { tool } from 'ai'
import { z } from 'zod'
import { getResourceById, updateResourceMetadata } from '../../services/library-service'
import type { AgentToolContext } from './types'

export const updateResourceMetadataInputSchema = z
  .object({
    id: z.string().describe('id resource/thư mục cần sửa'),
    name: z.string().optional().describe('tên mới'),
    tags: z.array(z.string()).optional().describe('danh sách tag mới — THAY THẾ hoàn toàn tag cũ, không cộng dồn'),
    category: z.string().optional(),
    notes: z.string().optional()
  })
  .refine((v) => v.name !== undefined || v.tags !== undefined || v.category !== undefined || v.notes !== undefined, {
    message: 'Cần ít nhất 1 trong: name, tags, category, notes — không có gì để đổi'
  })

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: library is global, not scoped to this run
export function createUpdateResourceMetadataTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Đổi tên và/hoặc sửa tag/category/ghi chú của 1 resource/thư mục đã có trong Thư viện — dùng để đổi tên (truyền "name") hoặc cập nhật tag/phân loại. KHÔNG dùng để sửa nội dung file (không có tool cho việc đó). Dùng list_resources trước để biết đúng id.',
    inputSchema: updateResourceMetadataInputSchema,
    execute: async ({ id, name, tags, category, notes }) => {
      try {
        const existing = getResourceById(id)
        if (!existing) return { ok: false, error: `Không tìm thấy resource "${id}"` }

        const updated = updateResourceMetadata(id, { name, tags, category, notes })
        return { ok: true, id: updated!.id, name: updated!.name }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  })
}
