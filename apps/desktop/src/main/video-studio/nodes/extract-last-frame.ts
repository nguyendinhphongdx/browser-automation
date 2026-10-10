import { BaseVideoNode, type VideoSocketValue } from './base-node'
import { extractLastFrame } from '../render/ffmpeg'

export class ExtractLastFrameNode extends BaseVideoNode {
  async execute(inputs: Record<string, VideoSocketValue>): Promise<Record<string, VideoSocketValue>> {
    const videoPath = inputs.video
    if (typeof videoPath !== 'string' || !videoPath) throw new Error('Thiếu video đầu vào')
    const framePath = await extractLastFrame(videoPath)
    return { image: framePath }
  }
}
