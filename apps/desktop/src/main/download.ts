// Platform utility DÙNG CHUNG — không thuộc domain nào (xem
// docs/conventions/01-main-process-layering.md), giống main/browser/. Trước
// patch này agent/tools/save-resource.ts tự có 1 bản sao logic này; thêm
// automation/nodes/integration.ts's DownloadFileNode cần chính xác cùng việc
// (fetch 1 URL ra Buffer, có giới hạn kích thước) nên tách ra đây thay vì
// viết bản thứ 3 — domain boundary cấm import thẳng file nội bộ của domain
// khác (agent/tools/ không phải "mặt" của domain nào domain khác được dùng).

export const MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024

export async function downloadToBuffer(url: string, maxBytes: number = MAX_DOWNLOAD_BYTES): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Tải file thất bại: ${res.status} (${url})`)
  const contentLength = res.headers.get('content-length')
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new Error(`File quá lớn (${contentLength} byte, giới hạn ${maxBytes} byte)`)
  }
  const buffer = Buffer.from(await res.arrayBuffer())
  if (buffer.byteLength > maxBytes) {
    throw new Error(`File quá lớn (${buffer.byteLength} byte, giới hạn ${maxBytes} byte)`)
  }
  return buffer
}

export function extensionFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname
    const ext = pathname.split('.').pop()
    return ext && /^[a-zA-Z0-9]{1,5}$/.test(ext) ? ext.toLowerCase() : null
  } catch {
    return null
  }
}
