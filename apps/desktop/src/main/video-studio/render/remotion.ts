import os from 'os'
import path from 'path'
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import type { CaptionCue, SubtitleBurnProps } from '../remotion/SubtitleBurn'

export type { CaptionCue }

const ENTRY_POINT = path.join(__dirname, '../remotion/index.ts')

// Bundle webpack 1 lần, tái dùng cho mọi lần burn sub trong cùng phiên chạy
// app — dựng bundle mất vài giây, không nên làm lại cho mỗi node/video.
let bundleLocationPromise: Promise<string> | null = null
function getBundleLocation(): Promise<string> {
  if (!bundleLocationPromise) bundleLocationPromise = bundle({ entryPoint: ENTRY_POINT })
  return bundleLocationPromise
}

/** Burn sub lên video bằng Remotion (style đẹp hơn filter `subtitles=` thô của ffmpeg) — dùng cho node Compose khi renderEngine = remotion. */
export async function burnSubtitles(
  videoPath: string,
  captions: CaptionCue[],
  onProgress?: (percent: number) => void
): Promise<string> {
  const serveUrl = await getBundleLocation()
  const inputProps: SubtitleBurnProps = { videoSrc: videoPath, captions }

  const composition = await selectComposition({ serveUrl, id: 'SubtitleBurn', inputProps })

  const outputLocation = path.join(os.tmpdir(), `video-studio-remotion-${Date.now()}.mp4`)
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    outputLocation,
    inputProps,
    onProgress: ({ progress }) => onProgress?.(progress * 100)
  })

  return outputLocation
}
