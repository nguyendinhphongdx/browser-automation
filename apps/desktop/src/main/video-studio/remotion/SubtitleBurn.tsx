import React from 'react'
import { AbsoluteFill, OffthreadVideo, useCurrentFrame, useVideoConfig } from 'remotion'

export interface CaptionCue {
  text: string
  startMs: number
  endMs: number
}

export type SubtitleBurnProps = {
  videoSrc: string
  captions: CaptionCue[]
} & Record<string, unknown>

/**
 * Composition tối giản: video nền + sub burn-in chữ trắng viền đen, căn giữa
 * dưới cùng — dùng khi node Compose cần style sub đẹp hơn ffmpeg's filter
 * `subtitles=` thô. Không phụ thuộc ffmpeg cho bước burn này, Remotion tự
 * render ra video hoàn chỉnh.
 */
export function SubtitleBurn({ videoSrc, captions }: SubtitleBurnProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const currentMs = (frame / fps) * 1000

  const activeCaption = captions.find((c) => currentMs >= c.startMs && currentMs < c.endMs)

  return (
    <AbsoluteFill>
      <OffthreadVideo src={videoSrc} />
      {activeCaption && (
        <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 60 }}>
          <div
            style={{
              fontFamily: 'sans-serif',
              fontSize: 42,
              fontWeight: 700,
              color: 'white',
              textAlign: 'center',
              maxWidth: '85%',
              textShadow: '0 0 6px black, 0 0 6px black, 2px 2px 2px black'
            }}
          >
            {activeCaption.text}
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  )
}
