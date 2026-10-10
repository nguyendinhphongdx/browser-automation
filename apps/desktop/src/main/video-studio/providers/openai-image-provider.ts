import fs from 'fs'
import os from 'os'
import path from 'path'
import { pathToFileURL } from 'url'
import { v4 as uuid } from 'uuid'
import type { VideoProvider, VideoJobParams, JobResult } from './types'

/**
 * Model tạo ảnh chuyên dụng (gpt-image-1) thay vì mượn endpoint ảnh phụ của
 * provider video — OpenAI's Images API trả ảnh ngay trong response (đồng
 * bộ), không có job/poll thật, dùng cùng mẹo "submit làm việc thật + ghi
 * file tạm, poll xác nhận ngay" như các TTS provider.
 */
export function createOpenAIImageProvider(apiKey: string): VideoProvider {
  const pending = new Map<string, string>()

  return {
    name: 'openai-image',

    async submit(params: VideoJobParams): Promise<string> {
      if (params.mode !== 'text-to-image') {
        throw new Error('OpenAI Image chỉ hỗ trợ tạo ảnh (text-to-image), không tạo video')
      }
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-image-1',
          prompt: params.prompt,
          size: params.aspectRatio === '9:16' ? '1024x1536' : params.aspectRatio === '1:1' ? '1024x1024' : '1536x1024'
        })
      })
      if (!res.ok) throw new Error(`OpenAI Image thất bại: ${res.status} ${await res.text()}`)

      const data = (await res.json()) as { data?: { b64_json?: string; url?: string }[] }
      const first = data.data?.[0]
      if (!first) throw new Error('OpenAI Image không trả về ảnh')

      const buffer = first.b64_json
        ? Buffer.from(first.b64_json, 'base64')
        : Buffer.from(await (await fetch(first.url!)).arrayBuffer())

      const jobId = uuid()
      const filePath = path.join(os.tmpdir(), `video-studio-image-${jobId}.png`)
      fs.writeFileSync(filePath, buffer)
      pending.set(jobId, filePath)
      return jobId
    },

    async poll(providerJobId: string): Promise<JobResult> {
      const filePath = pending.get(providerJobId)
      if (!filePath) return { status: 'failed', error: 'Không tìm thấy job ảnh này (có thể app đã restart)' }
      return { status: 'succeeded', outputUrl: pathToFileURL(filePath).toString() }
    }
  }
}
