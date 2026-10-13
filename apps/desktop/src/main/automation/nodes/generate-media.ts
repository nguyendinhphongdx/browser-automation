import fs from 'fs'
import { BaseNode } from './base-node'
import { getVideoProvider } from '../../video-studio/providers/registry'
import { runProviderJob } from '../../video-studio/providers/job-runner'
import { downloadToTemp } from '../../video-studio/download'
import { createResourceFromBuffer } from '../../services/library-service'
import type { LibraryResourceKind } from '../../../shared/types'

abstract class BaseGenerateMediaNode extends BaseNode {
  protected async init() {
    if (!this.config.provider) throw new Error('Provider is required')
    if (!this.config.prompt) throw new Error('Prompt is required')
  }

  protected async generateAndSave(
    mode: 'text-to-image' | 'text-to-video',
    kind: LibraryResourceKind,
    extension: string
  ): Promise<void> {
    const providerName = this.resolve(this.config.provider)
    const provider = getVideoProvider(providerName)
    const prompt = this.resolve(this.config.prompt)

    const result = await runProviderJob(provider, {
      mode,
      prompt,
      durationSec: this.config.durationSec ? Number(this.config.durationSec) : undefined,
      aspectRatio: this.config.aspectRatio ? this.resolve(this.config.aspectRatio) : undefined
    })

    if (result.status !== 'succeeded' || !result.outputUrl) {
      throw new Error(result.error || (kind === 'image' ? 'Tạo ảnh thất bại' : 'Tạo video thất bại'))
    }

    const localPath = await downloadToTemp(result.outputUrl, extension)
    const buffer = fs.readFileSync(localPath)

    const name = this.config.name
      ? this.resolve(this.config.name)
      : `${kind === 'image' ? 'Ảnh' : 'Video'} AI ${Date.now()}`
    const tags = this.config.tags
      ? this.resolve(this.config.tags).split(',').map((t: string) => t.trim()).filter(Boolean)
      : []

    const resource = createResourceFromBuffer({
      name, kind, extension, buffer,
      parentId: this.config.parentId ? this.resolve(this.config.parentId) : null,
      tags, objectType: 'workflow', objectId: this.ctx.workflowId ?? null
    })

    if (this.config.variable) this.setVar(this.config.variable, resource.id)
    this.log('info', `Đã tạo và lưu "${resource.name}" (${resource.id}) vào Thư viện`)
  }
}

export class GenerateImageNode extends BaseGenerateMediaNode {
  protected async execute() {
    await this.generateAndSave('text-to-image', 'image', 'png')
  }
}

export class GenerateVideoNode extends BaseGenerateMediaNode {
  protected async execute() {
    await this.generateAndSave('text-to-video', 'video', 'mp4')
  }
}
