import os from 'os'
import path from 'path'
import ffmpegStatic from 'ffmpeg-static'
import ffmpeg from 'fluent-ffmpeg'

if (ffmpegStatic) ffmpeg.setFfmpegPath(ffmpegStatic)

export interface RenderProgress {
  percent?: number
}

function tempPath(prefix: string, extension: string): string {
  return path.join(os.tmpdir(), `video-studio-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`)
}

/** Nối nhiều clip video theo thứ tự thành 1 file — dùng cho node Stitch. */
export function concatVideos(inputPaths: string[], onProgress?: (p: RenderProgress) => void): Promise<string> {
  if (inputPaths.length === 0) throw new Error('concatVideos: cần ít nhất 1 video đầu vào')
  const outputPath = tempPath('stitch', 'mp4')

  return new Promise((resolve, reject) => {
    const command = ffmpeg()
    for (const input of inputPaths) command.input(input)
    command
      .on('progress', (p) => onProgress?.({ percent: p.percent }))
      .on('error', reject)
      .on('end', () => resolve(outputPath))
      .mergeToFile(outputPath, os.tmpdir())
  })
}

/** Mix nhiều track audio (lời thoại + giọng kể + audio gốc...) thành 1 track — dùng cho node Audio Mix. */
export function mixAudioTracks(
  tracks: { path: string; volume?: number }[],
  onProgress?: (p: RenderProgress) => void
): Promise<string> {
  if (tracks.length === 0) throw new Error('mixAudioTracks: cần ít nhất 1 track đầu vào')
  const outputPath = tempPath('mix', 'mp3')

  return new Promise((resolve, reject) => {
    const command = ffmpeg()
    for (const track of tracks) command.input(track.path)

    const volumeFilters = tracks.map((t, i) => `[${i}:a]volume=${t.volume ?? 1}[a${i}]`)
    const mixInputs = tracks.map((_, i) => `[a${i}]`).join('')
    const complexFilter = [...volumeFilters, `${mixInputs}amix=inputs=${tracks.length}:duration=longest[aout]`]

    command
      .complexFilter(complexFilter, 'aout')
      .outputOptions(['-c:a', 'libmp3lame'])
      .on('progress', (p) => onProgress?.({ percent: p.percent }))
      .on('error', reject)
      .on('end', () => resolve(outputPath))
      .save(outputPath)
  })
}

/** Ghép video + audio (tuỳ chọn) + sub .srt (tuỳ chọn) thành video cuối — dùng cho node Compose khi renderEngine = ffmpeg. */
export function muxFinal(opts: {
  videoPath: string
  audioPath?: string
  subtitlePath?: string
  onProgress?: (p: RenderProgress) => void
}): Promise<string> {
  const outputPath = tempPath('compose', 'mp4')

  return new Promise((resolve, reject) => {
    const command = ffmpeg().input(opts.videoPath)
    if (opts.audioPath) command.input(opts.audioPath)

    const outputOptions = ['-c:v', 'libx264', '-c:a', 'aac', '-shortest']
    if (opts.subtitlePath) {
      // escape path cho filter string của ffmpeg (dấu ':' trên Windows cần escape riêng — xử lý khi test thật Phase F)
      command.videoFilters(`subtitles=${opts.subtitlePath.replace(/\\/g, '/').replace(/:/g, '\\:')}`)
    }

    command
      .outputOptions(outputOptions)
      .on('progress', (p) => opts.onProgress?.({ percent: p.percent }))
      .on('error', reject)
      .on('end', () => resolve(outputPath))
      .save(outputPath)
  })
}

/** Lấy khung hình cuối của 1 video — dùng cho node Extract Last Frame (continuity giữa các cảnh). */
export function extractLastFrame(videoPath: string): Promise<string> {
  const outputPath = tempPath('lastframe', 'png')

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .seekInput('-1') // 1 giây trước khi kết thúc — tránh hụt frame cuối cùng do rounding
      .outputOptions(['-vframes', '1', '-update', '1'])
      .on('error', reject)
      .on('end', () => resolve(outputPath))
      .save(outputPath)
  })
}
