import fs from 'fs'
import { BaseVideoNode, type VideoSocketValue } from './base-node'
import { createResourceFromBuffer } from '../../services/library-service'

export class SaveToLibraryNode extends BaseVideoNode {
  async execute(inputs: Record<string, VideoSocketValue>): Promise<Record<string, VideoSocketValue>> {
    const mediaPath = inputs.media
    if (typeof mediaPath !== 'string' || !mediaPath) throw new Error('Thiếu video để lưu')

    const name = this.resolveConfigString('name') || `video-${Date.now()}`
    const folderId = this.resolveConfigString('folderId') || null
    const tagsRaw = this.resolveConfigString('tags')
    const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : []

    const buffer = fs.readFileSync(mediaPath)
    const resource = createResourceFromBuffer({
      name,
      kind: 'video',
      extension: 'mp4',
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
