import fs from 'fs'
import os from 'os'
import path from 'path'
import { pathToFileURL } from 'url'
import { v4 as uuid } from 'uuid'
import { GoogleGenAI } from '@google/genai'
import type { VideoProvider, VideoJobParams, JobResult } from './types'

const MODEL = 'gemini-omni-1.1-flash'

/**
 * Model "omni" của Gemini sinh cả ảnh lẫn video qua cùng 1 endpoint
 * (`interactions.create`), chỉ đổi `response_format.type` — trả output
 * ngay trong response (không có job/poll thật), dùng cùng mẹo "submit làm
 * việc thật + ghi file tạm, poll xác nhận ngay" như openai-image-provider.ts.
 */
export function createGeminiOmniProvider(apiKey: string): VideoProvider {
  const pending = new Map<string, string>()
  const ai = new GoogleGenAI({ apiKey })

  return {
    name: 'gemini-omni',

    async submit(params: VideoJobParams): Promise<string> {
      const isImage = params.mode === 'text-to-image'
      const res = await ai.interactions.create({
        model: MODEL,
        input: params.prompt,
        response_format: {
          type: isImage ? 'image' : 'video',
          aspect_ratio: params.aspectRatio,
          ...(isImage ? {} : { resolution: '720p', duration: params.durationSec ? String(params.durationSec) : undefined })
        }
      })

      const output = isImage ? res.output_image : res.output_video
      if (!output?.data) throw new Error(`Gemini omni không trả về ${isImage ? 'ảnh' : 'video'}`)

      const buffer = Buffer.from(output.data, 'base64')
      const jobId = uuid()
      const extension = isImage ? 'png' : 'mp4'
      const filePath = path.join(os.tmpdir(), `video-studio-gemini-${jobId}.${extension}`)
      fs.writeFileSync(filePath, buffer)
      pending.set(jobId, filePath)
      return jobId
    },

    async poll(providerJobId: string): Promise<JobResult> {
      const filePath = pending.get(providerJobId)
      if (!filePath) return { status: 'failed', error: 'Không tìm thấy job này (có thể app đã restart)' }
      return { status: 'succeeded', outputUrl: pathToFileURL(filePath).toString() }
    }
  }
}
