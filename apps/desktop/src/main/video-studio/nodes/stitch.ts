import { BaseVideoNode, type VideoSocketValue } from './base-node'
import { concatVideos } from '../render/ffmpeg'

export class StitchNode extends BaseVideoNode {
  async execute(inputs: Record<string, VideoSocketValue>): Promise<Record<string, VideoSocketValue>> {
    const clips = Object.keys(inputs)
      .filter((key) => key.startsWith('video'))
      .sort((a, b) => Number(a.replace('video', '')) - Number(b.replace('video', '')))
      .map((key) => inputs[key])
      .filter((v): v is string => typeof v === 'string' && v.length > 0)

    if (clips.length === 0) throw new Error('Cần ít nhất 1 video để nối')

    const output = await concatVideos(clips, (p) => this.ctx.onNodeProgress?.(this.nodeId, p.percent ?? 0))
    return { video: output }
  }
}
