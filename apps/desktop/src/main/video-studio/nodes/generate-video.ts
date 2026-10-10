import { BaseVideoNode, type VideoSocketValue } from './base-node'
import { getVideoProvider } from '../providers/registry'
import { runProviderJob } from '../providers/job-runner'
import { downloadToTemp } from '../download'

export class GenerateVideoNode extends BaseVideoNode {
  async execute(inputs: Record<string, VideoSocketValue>): Promise<Record<string, VideoSocketValue>> {
    const providerName = this.resolveConfigString('provider') || 'kling'
    const provider = getVideoProvider(providerName)
    const mode = (this.resolveConfigString('mode') || 'text-to-video') as 'text-to-video' | 'image-to-video'

    const continuityFrame = typeof inputs.continuityFrame === 'string' ? inputs.continuityFrame : undefined
    const image = typeof inputs.image === 'string' ? inputs.image : undefined

    if (continuityFrame) {
      this.log('Dùng khung hình cuối của cảnh trước để khớp chuyển động')
    }

    const durationSec = Number(this.config.durationSec) || 5

    const result = await runProviderJob(
      provider,
      {
        mode: continuityFrame || image ? ('image-to-video' as const) : mode,
        prompt: typeof inputs.prompt === 'string' ? inputs.prompt : undefined,
        imagePath: image,
        continuityImagePath: continuityFrame,
        durationSec,
        aspectRatio: this.resolveConfigString('aspectRatio') || undefined
      },
      { onProgress: (r) => this.ctx.onNodeProgress?.(this.nodeId, r.progressPct ?? 0) }
    )

    if (result.status !== 'succeeded' || !result.outputUrl) {
      throw new Error(result.error || 'Tạo video thất bại')
    }

    const localPath = await downloadToTemp(result.outputUrl, 'mp4')
    return { video: localPath }
  }
}
