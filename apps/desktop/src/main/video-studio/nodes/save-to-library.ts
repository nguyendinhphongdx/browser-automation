import fs from 'fs'
import path from 'path'
import { BaseVideoNode, type VideoSocketValue } from './base-node'
import { createResourceFromBuffer } from '../../services/library-service'
import type { LibraryResourceKind } from '../../../shared/types'

// Node "media" input nhận cả IMAGE/VIDEO/AUDIO (node-definitions.ts) — không
// có kênh nào truyền kèm metadata "đây là loại gì" lúc chạy thật (giá trị
// qua lại giữa node chỉ là 1 đường dẫn file tạm), nên suy ra từ đúng phần mở
// rộng mà chính node tạo ra file đó đã dùng (generate-image: .png,
// generate-video: .mp4, tts-*: .mp3) — xem downloadToTemp() ở các node đó.
const KIND_BY_EXTENSION: Record<string, LibraryResourceKind> = {
  png: 'image', jpg: 'image', jpeg: 'image', webp: 'image',
  mp4: 'video', mov: 'video', webm: 'video',
  mp3: 'audio', wav: 'audio', aac: 'audio'
}

export class SaveToLibraryNode extends BaseVideoNode {
  async execute(inputs: Record<string, VideoSocketValue>): Promise<Record<string, VideoSocketValue>> {
    const mediaPath = inputs.media
    if (typeof mediaPath !== 'string' || !mediaPath) throw new Error('Thiếu media để lưu')

    const extension = path.extname(mediaPath).slice(1).toLowerCase() || 'mp4'
    const kind = KIND_BY_EXTENSION[extension] || 'video'

    const name = this.resolveConfigString('name') || `${kind}-${Date.now()}`
    const folderId = this.resolveConfigString('folderId') || null
    const tagsRaw = this.resolveConfigString('tags')
    const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : []

    const buffer = fs.readFileSync(mediaPath)
    const resource = createResourceFromBuffer({
      name,
      kind,
      extension,
      buffer,
      parentId: folderId,
      tags,
      objectType: 'video-pipeline',
      objectId: this.ctx.pipelineId
    })

    this.log(`Đã lưu vào Thư viện: ${resource.name} (${resource.id})`)
    return {}
  }
}
