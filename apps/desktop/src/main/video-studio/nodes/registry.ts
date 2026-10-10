import type { VideoExecutionContext, BaseVideoNode } from './base-node'
import { CharacterReferenceNode } from './character-reference'
import { ScenePromptNode } from './scene-prompt'
import { GenerateImageNode } from './generate-image'
import { GenerateVideoNode } from './generate-video'
import { ExtractLastFrameNode } from './extract-last-frame'
import { TTSNode } from './tts'
import { SubtitleNode } from './subtitle'
import { StitchNode } from './stitch'
import { AudioMixNode } from './audio-mix'
import { ComposeNode } from './compose'
import { SaveToLibraryNode } from './save-to-library'

type VideoNodeClass = new (nodeId: string, config: Record<string, any>, ctx: VideoExecutionContext) => BaseVideoNode

const VIDEO_NODE_REGISTRY: Record<string, VideoNodeClass> = {
  'character-reference': CharacterReferenceNode,
  'scene-prompt': ScenePromptNode,
  'generate-image': GenerateImageNode,
  'generate-video': GenerateVideoNode,
  'extract-last-frame': ExtractLastFrameNode,
  'tts-dialogue': TTSNode,
  'tts-narration': TTSNode,
  subtitle: SubtitleNode,
  stitch: StitchNode,
  'audio-mix': AudioMixNode,
  compose: ComposeNode,
  'save-to-library': SaveToLibraryNode
}

export function createVideoNode(
  nodeType: string,
  nodeId: string,
  config: Record<string, any>,
  ctx: VideoExecutionContext
): BaseVideoNode {
  const NodeClass = VIDEO_NODE_REGISTRY[nodeType]
  if (!NodeClass) throw new Error(`Loại node video không hợp lệ: "${nodeType}"`)
  return new NodeClass(nodeId, config, ctx)
}
