import { tool } from 'ai'
import { z } from 'zod'
import { getChildren, searchResources } from '../../services/library-service'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: library is global, not scoped to this run
export function createListResourcesTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Liệt kê tài nguyên trong Thư viện (ảnh, prompt mẫu, data export, file) — dùng để xem thư viện đang có gì trước khi quyết định dùng/lưu resource nào. Không truyền "query" để duyệt theo cây thư mục từng cấp một (như người dùng duyệt UI); truyền "query" để tìm xuyên suốt cả thư viện theo tên/tag.',
    inputSchema: z.object({
      parentId: z
        .string()
        .optional()
        .describe('id của 1 thư mục để xem bên trong nó; bỏ trống = xem ở gốc thư viện. Bỏ qua nếu có "query".'),
      query: z.string().optional().describe('tìm theo tên/tag xuyên suốt cả thư viện, bỏ qua cấu trúc thư mục')
    }),
    execute: async ({ parentId, query }) => {
      const rows = query ? searchResources(query) : getChildren(parentId ?? null)
      return {
        ok: true,
        resources: rows.map((r) => ({
          id: r.id,
          name: r.name,
          kind: r.kind,
          mimeType: r.mimeType,
          sizeBytes: r.sizeBytes,
          tags: r.tags,
          parentId: r.parentId,
          updatedAt: r.updatedAt
        }))
      }
    }
  })
}
