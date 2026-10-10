import jwt from 'jsonwebtoken'
import type { VideoProvider, VideoJobParams, JobResult } from './types'

const BASE_URL = 'https://api-singapore.klingai.com'

/** Token sống ngắn, ký mới mỗi lần gọi — không cache/dùng lại giữa các request. */
function authHeader(accessKey: string, secretKey: string): string {
  const now = Math.floor(Date.now() / 1000)
  const token = jwt.sign({ iss: accessKey, exp: now + 1800, nbf: now - 5 }, secretKey, { algorithm: 'HS256' })
  return `Bearer ${token}`
}

export function createKlingProvider(accessKey: string, secretKey: string): VideoProvider {
  return {
    name: 'kling',

    async submit(params: VideoJobParams): Promise<string> {
      const isImageToVideo = params.mode === 'image-to-video' && (params.imagePath || params.continuityImagePath)
      const endpoint = isImageToVideo ? '/v1/videos/image2video' : '/v1/videos/text2video'

      const body: Record<string, unknown> = {
        prompt: params.prompt,
        aspect_ratio: params.aspectRatio || '16:9',
        duration: String(params.durationSec || 5)
      }
      if (isImageToVideo) {
        body.image = params.continuityImagePath || params.imagePath
      }

      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { Authorization: authHeader(accessKey, secretKey), 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!res.ok) throw new Error(`Kling submit thất bại: ${res.status} ${await res.text()}`)
      const data = (await res.json()) as { data?: { task_id?: string } }
      const taskId = data.data?.task_id
      if (!taskId) throw new Error('Kling không trả về task_id')
      return taskId
    },

    async poll(providerJobId: string): Promise<JobResult> {
      const res = await fetch(`${BASE_URL}/v1/videos/text2video/${providerJobId}`, {
        headers: { Authorization: authHeader(accessKey, secretKey) }
      })
      if (!res.ok) return { status: 'failed', error: `Kling poll thất bại: ${res.status}` }
      const data = (await res.json()) as {
        data?: { task_status?: string; task_result?: { videos?: { url?: string }[] } }
      }
      const taskStatus = data.data?.task_status
      if (taskStatus === 'succeed') {
        const url = data.data?.task_result?.videos?.[0]?.url
        return url ? { status: 'succeeded', outputUrl: url } : { status: 'failed', error: 'Thiếu url video trả về' }
      }
      if (taskStatus === 'failed') return { status: 'failed', error: 'Kling báo job thất bại' }
      return { status: 'running' }
    }
  }
}
