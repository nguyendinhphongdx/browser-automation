import { BaseVideoNode, type VideoSocketValue } from './base-node'
import { getTTSProvider } from '../providers/registry'
import { runProviderJob } from '../providers/job-runner'
import { downloadToTemp } from '../download'
import { getResourceById, resourceFilePath } from '../../services/library-service'

/**
 * Dùng chung cho cả 2 node type 'tts-dialogue' và 'tts-narration' (đăng ký
 * 2 lần trong registry.ts) — logic chạy giống hệt nhau, chỉ khác vai trò
 * ngữ nghĩa (lời thoại nhân vật vs giọng kể ngoại cảnh), không khác gì ở
 * tầng thực thi.
 */
export class TTSNode extends BaseVideoNode {
  async execute(inputs: Record<string, VideoSocketValue>): Promise<Record<string, VideoSocketValue>> {
    const mode = this.resolveConfigString('mode') || 'provider'

    if (mode === 'import') {
      const resourceId = this.resolveConfigString('importedAudio')
      if (!resourceId) throw new Error('Chưa chọn file âm thanh có sẵn')
      const resource = getResourceById(resourceId)
      if (!resource) throw new Error(`Không tìm thấy resource âm thanh: ${resourceId}`)
      return { audio: resourceFilePath(resource.id, resource.extension) }
    }

    const text = typeof inputs.text === 'string' ? inputs.text : ''
    if (!text) throw new Error('Thiếu nội dung để đọc')

    const providerName = this.resolveConfigString('provider') || 'elevenlabs'
    const provider = getTTSProvider(providerName)
    const voiceId = this.resolveConfigString('voiceId') || undefined

    const result = await runProviderJob(
      provider,
      { text, voiceId },
      { onProgress: (r) => this.ctx.onNodeProgress?.(this.nodeId, r.progressPct ?? 0) }
    )

    if (result.status !== 'succeeded' || !result.outputUrl) {
      throw new Error(result.error || 'Tạo giọng nói thất bại')
    }

    const localPath = await downloadToTemp(result.outputUrl, 'mp3')
    return { audio: localPath }
  }
}
