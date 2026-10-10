import { BaseVideoNode, type VideoSocketValue } from './base-node'
import { getVideoProvider } from '../providers/registry'
import { runProviderJob } from '../providers/job-runner'
import { downloadToTemp } from '../download'

export class GenerateImageNode extends BaseVideoNode {
  async execute(inputs: Record<string, VideoSocketValue>): Promise<Record<string, VideoSocketValue>> {
    const providerName = this.resolveConfigString('provider') || 'kling'
    const provider = getVideoProvider(providerName)

    const result = await runProviderJob(
      provider,
      {
        mode: 'text-to-image' as const,
        prompt: typeof inputs.prompt === 'string' ? inputs.prompt : undefined,
        imagePath: typeof inputs.referenceImage === 'string' ? inputs.referenceImage : undefined,
        aspectRatio: this.resolveConfigString('aspectRatio') || undefined
      },
      { onProgress: (r) => this.ctx.onNodeProgress?.(this.nodeId, r.progressPct ?? 0) }
    )

    if (result.status !== 'succeeded' || !result.outputUrl) {
      throw new Error(result.error || 'Tạo ảnh thất bại')
    }

    const localPath = await downloadToTemp(result.outputUrl, 'png')
    return { image: localPath }
  }
}
