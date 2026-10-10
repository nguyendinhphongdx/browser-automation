import fs from 'fs'
import type { VideoSocketValue } from './nodes/base-node'
import { VIDEO_NODE_DEFINITIONS } from './node-definitions'

export interface NodeOutputPreview {
  kind: 'image' | 'video' | 'audio' | 'text' | 'value'
  dataUrl?: string
  text?: string
}

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  wav: 'audio/wav'
}

// Giới hạn kích thước file đọc để base64 qua IPC — tránh 1 video dài làm
// payload IPC phình to; node đó vẫn chạy/lưu bình thường, chỉ không có
// preview trên canvas (xem trong Thư viện sau khi Save to Library thay vào).
const MAX_PREVIEW_BYTES = 15 * 1024 * 1024

/**
 * Sinh preview nhẹ từ output THẬT của 1 node vừa chạy xong — hiện trực tiếp
 * lên node trên canvas (kiểu ComfyUI). Khác onScreenshot/onResourcePreview
 * của AI Agent (phục vụ cả model lẫn UI); cái này chỉ phục vụ UI canvas.
 * Chỉ lấy output ĐẦU TIÊN khớp 1 trong các kiểu hiển thị được — mọi node
 * video-studio hiện tại đều có đúng 1 output, nên trong thực tế là output
 * duy nhất của node đó.
 */
export function buildNodeOutputPreview(
  nodeType: string,
  outputs: Record<string, VideoSocketValue>
): NodeOutputPreview | null {
  const def = VIDEO_NODE_DEFINITIONS.find((d) => d.type === nodeType)
  if (!def) return null

  for (const socket of def.outputs) {
    const value = outputs[socket.name]
    if (value === undefined) continue

    if (socket.type === 'TEXT' && typeof value === 'string') {
      return { kind: 'text', text: value.length > 200 ? value.slice(0, 200) + '…' : value }
    }

    if ((socket.type === 'IMAGE' || socket.type === 'VIDEO' || socket.type === 'AUDIO') && typeof value === 'string') {
      const ext = value.split('.').pop()?.toLowerCase() || ''
      const mime = MIME_BY_EXT[ext]
      if (!mime) continue
      try {
        const stat = fs.statSync(value)
        if (stat.size > MAX_PREVIEW_BYTES) continue
        const buffer = fs.readFileSync(value)
        const kind = socket.type === 'IMAGE' ? 'image' : socket.type === 'VIDEO' ? 'video' : 'audio'
        return { kind, dataUrl: `data:${mime};base64,${buffer.toString('base64')}` }
      } catch {
        continue
      }
    }

    if (socket.type === 'NUMBER' || socket.type === 'BOOLEAN') {
      return { kind: 'value', text: String(value) }
    }
  }
  return null
}
