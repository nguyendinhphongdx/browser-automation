import fs from 'fs'
import os from 'os'
import path from 'path'
import { pathToFileURL } from 'url'
import { v4 as uuid } from 'uuid'
import { GoogleGenAI } from '@google/genai'
import type { VideoProvider, VideoJobParams, JobResult } from './types'

export interface GeminiOmniModels {
  /** Mặc định 'gemini-omni-1.1-flash' — đã kiểm chứng thật, sinh video ổn định. */
  videoModel?: string
  /**
   * KHÔNG có default — 'gemini-omni-1.1-flash' đã kiểm chứng CHỈ sinh video:
   * dù gửi response_format.type:'image', nó vẫn trả về output_video (bỏ qua
   * yêu cầu ảnh) hoặc đôi lúc lỗi 404 "model not found" thẳng từ server. Bắt
   * người dùng tự nhập đúng tên model ảnh thật (trong Cài đặt) thay vì đoán
   * bừa 1 tên có thể không tồn tại hoặc âm thầm trả sai loại media.
   */
  imageModel?: string
}

/**
 * Model "omni" của Gemini sinh cả ảnh lẫn video qua cùng 1 endpoint
 * (`interactions.create`), chỉ đổi `response_format.type` — trả output
 * ngay trong response (không có job/poll thật), dùng cùng mẹo "submit làm
 * việc thật + ghi file tạm, poll xác nhận ngay" như openai-image-provider.ts.
 */
export function createGeminiOmniProvider(apiKey: string, models: GeminiOmniModels = {}): VideoProvider {
  const pending = new Map<string, string>()
  const ai = new GoogleGenAI({ apiKey })

  return {
    name: 'gemini-omni',

    async submit(params: VideoJobParams): Promise<string> {
      const isImage = params.mode === 'text-to-image'
      if (isImage && !models.imageModel) {
        throw new Error(
          'Chưa cấu hình model ảnh cho Gemini (omni) trong Cài đặt — "gemini-omni-1.1-flash" đã kiểm chứng chỉ sinh video, không dùng được cho tạo ảnh.'
        )
      }
      const model = isImage ? models.imageModel! : (models.videoModel || 'gemini-omni-1.1-flash')

      const res = await ai.interactions.create({
        model,
        input: params.prompt,
        response_format: {
          type: isImage ? 'image' : 'video',
          aspect_ratio: params.aspectRatio,
          ...(isImage ? {} : { resolution: '720p', duration: params.durationSec ? String(params.durationSec) : undefined })
        }
      })

      const output = isImage ? res.output_image : res.output_video
      if (!output?.data) throw new Error(`Gemini omni (model "${model}") không trả về ${isImage ? 'ảnh' : 'video'}`)

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
