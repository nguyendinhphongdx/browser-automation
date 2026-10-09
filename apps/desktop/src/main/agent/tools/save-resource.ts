import { tool } from 'ai'
import { z } from 'zod'
import { createResourceFromBuffer, mimeTypeForExtension, defaultExtensionForKind } from '../../services/library-service'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: library is global, not scoped to this run
export function createSaveResourceTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Lưu 1 tài nguyên mới vào Thư viện — dùng khi người dùng muốn giữ lại 1 kết quả (data crawl được, ghi chú, ảnh...) để dùng lại sau, qua AI hoặc qua workflow. Chỉ TẠO MỚI, không ghi đè resource có sẵn.',
    inputSchema: z.object({
      name: z.string().describe('tên hiển thị của tài nguyên'),
      kind: z.enum(['file', 'image', 'prompt-template', 'data-export']),
      content: z.string().describe('nội dung: text thường (utf8) hoặc base64 (ảnh/file nhị phân)'),
      encoding: z.enum(['utf8', 'base64']).default('utf8'),
      mimeType: z.string().optional(),
      tags: z.array(z.string()).optional(),
      parentId: z.string().optional().describe('id thư mục muốn lưu vào; bỏ trống = lưu ở gốc thư viện')
    }),
    execute: async ({ name, kind, content, encoding, mimeType, tags, parentId }) => {
      try {
        const buffer = encoding === 'base64' ? Buffer.from(content, 'base64') : Buffer.from(content, 'utf-8')
        const extension = defaultExtensionForKind(kind)
        const resource = createResourceFromBuffer({
          name,
          kind,
          mimeType: mimeType || mimeTypeForExtension(extension),
          extension,
          buffer,
          parentId: parentId ?? null,
          tags,
          objectType: 'agent'
        })
        return { ok: true, id: resource.id, name: resource.name }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  })
}
