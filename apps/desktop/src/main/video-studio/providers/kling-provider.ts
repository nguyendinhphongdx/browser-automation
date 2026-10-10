import jwt from 'jsonwebtoken'
import type { VideoProvider, VideoJobParams, JobResult } from './types'

const BASE_URL = 'https://api-singapore.klingai.com'

/** Token sống ngắn, ký mới mỗi lần gọi — không cache/dùng lại giữa các request. */
function authHeader(accessKey: string, secretKey: string): string {
  const now = Math.floor(Date.now() / 1000)
  const token = jwt.sign({ iss: accessKey, exp: now + 1800, nbf: now - 5 }, secretKey, { algorithm: 'HS256' })
  return `Bearer ${token}`
}

type Kind = 'image' | 'video'

// Kling có 2 họ endpoint khác nhau hẳn cho ảnh/video (không chung 1 task
// namespace) — mã hoá loại ngay trong providerJobId trả về ("image:xxx" /
// "video:xxx") để poll() biết phải hỏi endpoint nào, không cần thêm state
// ngoài interface VideoProvider (chỉ có submit()/poll() nhận 1 string id).
function encodeJobId(kind: Kind, taskId: string): string {
  return `${kind}:${taskId}`
}
function decodeJobId(jobId: string): { kind: Kind; taskId: string } {
  const [kind, ...rest] = jobId.split(':')
  return { kind: kind as Kind, taskId: rest.join(':') }
}

export function createKlingProvider(accessKey: string, secretKey: string): VideoProvider {
  return {
    name: 'kling',

    async submit(params: VideoJobParams): Promise<string> {
      const auth = authHeader(accessKey, secretKey)

      if (params.mode === 'text-to-image') {
        const res = await fetch(`${BASE_URL}/v1/images/generations`, {
          method: 'POST',
          headers: { Authorization: auth, 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: params.prompt, aspect_ratio: params.aspectRatio || '16:9' })
        })
        if (!res.ok) throw new Error(`Kling submit (image) thất bại: ${res.status} ${await res.text()}`)
        const data = (await res.json()) as { data?: { task_id?: string } }
        if (!data.data?.task_id) throw new Error('Kling không trả về task_id')
        return encodeJobId('image', data.data.task_id)
      }

      const isImageToVideo = params.mode === 'image-to-video' && (params.imagePath || params.continuityImagePath)
      const endpoint = isImageToVideo ? '/v1/videos/image2video' : '/v1/videos/text2video'
      const body: Record<string, unknown> = {
        prompt: params.prompt,
        aspect_ratio: params.aspectRatio || '16:9',
        duration: String(params.durationSec || 5)
      }
      if (isImageToVideo) body.image = params.continuityImagePath || params.imagePath

      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!res.ok) throw new Error(`Kling submit thất bại: ${res.status} ${await res.text()}`)
      const data = (await res.json()) as { data?: { task_id?: string } }
      if (!data.data?.task_id) throw new Error('Kling không trả về task_id')
      return encodeJobId('video', data.data.task_id)
    },

    async poll(providerJobId: string): Promise<JobResult> {
      const { kind, taskId } = decodeJobId(providerJobId)
      const endpoint = kind === 'image' ? `/v1/images/generations/${taskId}` : `/v1/videos/text2video/${taskId}`

      const res = await fetch(`${BASE_URL}${endpoint}`, { headers: { Authorization: authHeader(accessKey, secretKey) } })
      if (!res.ok) return { status: 'failed', error: `Kling poll thất bại: ${res.status}` }

      const data = (await res.json()) as {
        data?: {
          task_status?: string
          task_result?: { videos?: { url?: string }[]; images?: { url?: string }[] }
        }
      }
      const taskStatus = data.data?.task_status
      if (taskStatus === 'succeed') {
        const url = kind === 'image' ? data.data?.task_result?.images?.[0]?.url : data.data?.task_result?.videos?.[0]?.url
        return url ? { status: 'succeeded', outputUrl: url } : { status: 'failed', error: 'Thiếu url kết quả trả về' }
      }
      if (taskStatus === 'failed') return { status: 'failed', error: 'Kling báo job thất bại' }
      return { status: 'running' }
    }
  }
}
