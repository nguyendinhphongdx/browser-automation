import fs from 'fs'
import { BaseVideoNode, type VideoSocketValue } from './base-node'
import { muxFinal } from '../render/ffmpeg'
import { burnSubtitles, type CaptionCue } from '../render/remotion'

function parseSrtTimestamp(ts: string): number {
  const [h, m, rest] = ts.split(':')
  const [s, ms] = rest.split(',')
  return Number(h) * 3600_000 + Number(m) * 60_000 + Number(s) * 1000 + Number(ms)
}

function parseSrt(content: string): CaptionCue[] {
  const blocks = content.trim().split(/\r?\n\r?\n/)
  const cues: CaptionCue[] = []
  for (const block of blocks) {
    const lines = block.split(/\r?\n/)
    const timeLine = lines.find((l) => l.includes('-->'))
    if (!timeLine) continue
    const [startRaw, endRaw] = timeLine.split('-->').map((s) => s.trim())
    const text = lines.slice(lines.indexOf(timeLine) + 1).join(' ')
    cues.push({ text, startMs: parseSrtTimestamp(startRaw), endMs: parseSrtTimestamp(endRaw) })
  }
  return cues
}

export class ComposeNode extends BaseVideoNode {
  async execute(inputs: Record<string, VideoSocketValue>): Promise<Record<string, VideoSocketValue>> {
    const videoPath = inputs.video
    if (typeof videoPath !== 'string' || !videoPath) throw new Error('Thiếu video đầu vào')
    const audioPath = typeof inputs.audio === 'string' ? inputs.audio : undefined
    const subtitlePath = typeof inputs.subtitleTrack === 'string' ? inputs.subtitleTrack : undefined

    const renderEngine = this.resolveConfigString('renderEngine') || 'auto'
    const useRemotion = renderEngine === 'remotion' || (renderEngine === 'auto' && !!subtitlePath)

    if (!useRemotion) {
      const output = await muxFinal({
        videoPath,
        audioPath,
        subtitlePath,
        onProgress: (p) => this.ctx.onNodeProgress?.(this.nodeId, p.percent ?? 0)
      })
      return { video: output }
    }

    // Đường Remotion: nếu có audio, mux audio vào video trước bằng ffmpeg
    // (Remotion's SubtitleBurn chỉ lo phần burn sub, không lo mix audio),
    // rồi mới burn sub style đẹp lên trên.
    const videoWithAudio = audioPath
      ? await muxFinal({ videoPath, audioPath, onProgress: (p) => this.ctx.onNodeProgress?.(this.nodeId, (p.percent ?? 0) / 2) })
      : videoPath

    const captions = subtitlePath ? parseSrt(fs.readFileSync(subtitlePath, 'utf-8')) : []
    const output = await burnSubtitles(videoWithAudio, captions, (percent) =>
      this.ctx.onNodeProgress?.(this.nodeId, audioPath ? 50 + percent / 2 : percent)
    )
    return { video: output }
  }
}
