import fs from 'fs'
import os from 'os'
import path from 'path'
import { BaseVideoNode, type VideoSocketValue } from './base-node'

function formatSrtTimestamp(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.floor(totalSeconds % 60)
  const ms = Math.round((totalSeconds - Math.floor(totalSeconds)) * 1000)
  const pad = (n: number, len = 2) => String(n).padStart(len, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`
}

/**
 * v1: chưa có dữ liệu timing chi tiết theo câu từ upstream (socket TEXT chỉ
 * mang 1 chuỗi text, không có mốc thời gian) — ước lượng thời lượng hiển thị
 * theo tốc độ đọc trung bình (~15 ký tự/giây) thay vì chính xác tuyệt đối.
 */
export class SubtitleNode extends BaseVideoNode {
  async execute(inputs: Record<string, VideoSocketValue>): Promise<Record<string, VideoSocketValue>> {
    const text = typeof inputs.text === 'string' ? inputs.text.trim() : ''
    if (!text) throw new Error('Thiếu nội dung phụ đề')

    const estimatedSeconds = Math.max(2, text.length / 15)
    const srtContent = `1\n${formatSrtTimestamp(0)} --> ${formatSrtTimestamp(estimatedSeconds)}\n${text}\n`

    const filePath = path.join(os.tmpdir(), `video-studio-subtitle-${Date.now()}.srt`)
    fs.writeFileSync(filePath, srtContent, 'utf-8')
    return { subtitleTrack: filePath }
  }
}
