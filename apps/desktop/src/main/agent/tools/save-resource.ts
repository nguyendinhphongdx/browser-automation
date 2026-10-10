import { tool } from 'ai'
import { z } from 'zod'
import { createResourceFromBuffer, mimeTypeForExtension, defaultExtensionForKind } from '../../services/library-service'
import type { AgentToolContext } from './types'

// Tải về trước khi lưu thay vì bắt model tự nhồi base64 vào tool call — model
// không có cách nào tải URL thành bytes rồi tự encode base64 (không có fetch,
// run_js chỉ thao tác DOM), nên trước patch này "content" base64 chỉ dùng
// được cho đúng trường hợp model TỰ TAY tạo ra nội dung (text/JSON), không
// dùng được cho ảnh/file ở 1 URL — vốn là trường hợp phổ biến nhất thực tế
// (ảnh vừa tạo xong từ provider, ảnh tìm thấy trên trang). Giới hạn kích
// thước cùng tinh thần MAX_PREVIEW_BYTES ở build-node-preview.ts — tránh
// model trỏ nhầm vào 1 URL khổng lồ.
const MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024

async function downloadToBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Tải file thất bại: ${res.status} (${url})`)
  const contentLength = res.headers.get('content-length')
  if (contentLength && Number(contentLength) > MAX_DOWNLOAD_BYTES) {
    throw new Error(`File quá lớn (${contentLength} byte, giới hạn ${MAX_DOWNLOAD_BYTES} byte)`)
  }
  const buffer = Buffer.from(await res.arrayBuffer())
  if (buffer.byteLength > MAX_DOWNLOAD_BYTES) {
    throw new Error(`File quá lớn (${buffer.byteLength} byte, giới hạn ${MAX_DOWNLOAD_BYTES} byte)`)
  }
  return buffer
}

function extensionFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname
    const ext = pathname.split('.').pop()
    return ext && /^[a-zA-Z0-9]{1,5}$/.test(ext) ? ext.toLowerCase() : null
  } catch {
    return null
  }
}

export const saveResourceInputSchema = z
  .object({
    name: z.string().describe('tên hiển thị của tài nguyên'),
    kind: z.enum(['file', 'image', 'prompt-template', 'data-export']),
    sourceUrl: z.string().url().optional().describe('URL ảnh/file cần lưu — tool tự tải về, không cần qua "content"'),
    content: z.string().optional().describe('nội dung text (utf8) bạn tự viết ra — note/JSON/data crawl. Không dùng để nhồi base64 của 1 URL, dùng "sourceUrl" cho việc đó.'),
    mimeType: z.string().optional(),
    tags: z.array(z.string()).optional(),
    parentId: z.string().optional().describe('id thư mục muốn lưu vào; bỏ trống = lưu ở gốc thư viện')
  })
  .refine((v) => !!v.sourceUrl !== !!v.content, {
    message: 'Cần đúng 1 trong 2: "sourceUrl" (tải từ URL) hoặc "content" (text tự viết) — không được cả 2 hoặc không có gì'
  })

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: library is global, not scoped to this run
export function createSaveResourceTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Lưu 1 tài nguyên mới vào Thư viện — dùng khi người dùng muốn giữ lại 1 kết quả (data crawl được, ghi chú, ảnh, file...) để dùng lại sau, qua AI hoặc qua workflow. Chỉ TẠO MỚI, không ghi đè resource có sẵn. Cần ĐÚNG 1 TRONG 2: "sourceUrl" (tool tự tải file thật về — dùng cho ảnh/video/file có ở 1 URL, vd kết quả từ provider tạo ảnh hay link tìm thấy trên trang, KHÔNG tự đọc/encode base64 rồi nhét vào "content") hoặc "content" (text thường bạn tự viết ra — note, JSON, data crawl).',
    inputSchema: saveResourceInputSchema,
    execute: async ({ name, kind, sourceUrl, content, mimeType, tags, parentId }) => {
      try {
        const buffer = sourceUrl ? await downloadToBuffer(sourceUrl) : Buffer.from(content!, 'utf-8')
        const extension = (sourceUrl && extensionFromUrl(sourceUrl)) || defaultExtensionForKind(kind)
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
