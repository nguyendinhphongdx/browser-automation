import React from 'react'
import { Composition, registerRoot } from 'remotion'
import { SubtitleBurn, type SubtitleBurnProps } from './SubtitleBurn'

const DEFAULT_PROPS: SubtitleBurnProps = { videoSrc: '', captions: [] }

function RemotionRoot() {
  return (
    <Composition
      id="SubtitleBurn"
      component={SubtitleBurn}
      durationInFrames={1}
      fps={30}
      width={1280}
      height={720}
      defaultProps={DEFAULT_PROPS}
      // durationInFrames/width/height thật được tính lại mỗi lần render qua
      // calculateMetadata — video nền có độ dài/kích thước khác nhau tuỳ cảnh.
      calculateMetadata={async ({ props }) => {
        const { getVideoMetadata } = await import('@remotion/renderer')
        const meta = await getVideoMetadata(props.videoSrc as string)
        return {
          durationInFrames: Math.max(1, Math.round((meta.durationInSeconds || 1) * 30)),
          width: meta.width,
          height: meta.height
        }
      }}
    />
  )
}

registerRoot(RemotionRoot)
