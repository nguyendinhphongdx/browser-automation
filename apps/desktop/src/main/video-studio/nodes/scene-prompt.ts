import { BaseVideoNode, type VideoSocketValue } from './base-node'

export class ScenePromptNode extends BaseVideoNode {
  async execute(): Promise<Record<string, VideoSocketValue>> {
    const prompt = this.resolveConfigString('prompt')
    if (!prompt) throw new Error('Chưa nhập prompt cho cảnh này')
    return { text: prompt }
  }
}
