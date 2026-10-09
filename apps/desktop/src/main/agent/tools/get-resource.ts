import { tool } from 'ai'
import { z } from 'zod'
import {
  getResourceById, getResourceTextContent, getResourceDataUrl, resourceFilePath
} from '../../services/library-service'
import type { AgentToolContext } from './types'

export function createGetResourceTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Đọc 1 tài nguyên cụ thể trong Thư viện theo id (lấy id từ list_resources trước). Prompt mẫu/text/JSON trả về nội dung text dùng được ngay. Ảnh KHÔNG trả byte/base64 cho bạn (model) — ảnh được hiển thị trực tiếp cho người dùng xem, bạn chỉ nhận metadata. File/dữ liệu khác trả về đường dẫn file cục bộ (dùng được cho các hành động như upload file qua input).',
    inputSchema: z.object({ id: z.string() }),
    execute: async ({ id }) => {
      const resource = getResourceById(id)
      if (!resource) return { ok: false, error: 'Không tìm thấy tài nguyên với id này' }
      if (resource.kind === 'folder') {
        return { ok: false, error: 'id này là 1 thư mục — dùng list_resources với parentId để xem bên trong' }
      }

      if (resource.kind === 'prompt-template' || resource.mimeType.startsWith('text/') || resource.mimeType === 'application/json') {
        const content = getResourceTextContent(id)
        return { ok: true, kind: resource.kind, mimeType: resource.mimeType, name: resource.name, content: content ?? '' }
      }

      if (resource.kind === 'image') {
        const dataUrl = getResourceDataUrl(id)
        if (dataUrl) ctx.onResourcePreview?.(dataUrl, resource.name)
        return {
          ok: true,
          kind: 'image',
          name: resource.name,
          mimeType: resource.mimeType,
          sizeBytes: resource.sizeBytes,
          note: 'Ảnh đã được hiển thị trực tiếp cho người dùng trong giao diện — bạn (model) không nhận được pixel/base64 của ảnh này.'
        }
      }

      return {
        ok: true,
        kind: resource.kind,
        name: resource.name,
        mimeType: resource.mimeType,
        sizeBytes: resource.sizeBytes,
        localPath: resourceFilePath(resource.id, resource.extension)
      }
    }
  })
}
