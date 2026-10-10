import { BaseVideoNode, type VideoSocketValue } from './base-node'
import { mixAudioTracks } from '../render/ffmpeg'

export class AudioMixNode extends BaseVideoNode {
  async execute(inputs: Record<string, VideoSocketValue>): Promise<Record<string, VideoSocketValue>> {
    const tracks = Object.keys(inputs)
      .filter((key) => key.startsWith('track'))
      .sort((a, b) => Number(a.replace('track', '')) - Number(b.replace('track', '')))
      .map((key) => inputs[key])
      .filter((v): v is string => typeof v === 'string' && v.length > 0)
      .map((path) => ({ path, volume: 1 }))

    if (tracks.length === 0) throw new Error('Cần ít nhất 1 track âm thanh để mix')

    const output = await mixAudioTracks(tracks, (p) => this.ctx.onNodeProgress?.(this.nodeId, p.percent ?? 0))
    return { audio: output }
  }
}
