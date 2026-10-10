import type { VideoProvider, VideoJobParams, JobResult } from './types'

const BASE_URL = 'https://api.dev.runwayml.com/v1'
const API_VERSION = '2024-11-06'

export function createRunwayProvider(apiKey: string): VideoProvider {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'X-Runway-Version': API_VERSION,
    'Content-Type': 'application/json'
  }

  return {
    name: 'runway',

    async submit(params: VideoJobParams): Promise<string> {
      if (params.mode === 'text-to-image') {
        const res = await fetch(`${BASE_URL}/text_to_image`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ promptText: params.prompt, ratio: params.aspectRatio || '1280:720' })
        })
        if (!res.ok) throw new Error(`Runway submit (image) thất bại: ${res.status} ${await res.text()}`)
        const data = (await res.json()) as { id?: string }
        if (!data.id) throw new Error('Runway không trả về task id')
        return data.id
      }

      const image = params.continuityImagePath || params.imagePath
      const endpoint = image ? '/image_to_video' : '/text_to_video'
      const body: Record<string, unknown> = {
        promptText: params.prompt,
        ratio: params.aspectRatio || '1280:720',
        duration: params.durationSec || 5
      }
      if (image) body.promptImage = image

      const res = await fetch(`${BASE_URL}${endpoint}`, { method: 'POST', headers, body: JSON.stringify(body) })
      if (!res.ok) throw new Error(`Runway submit thất bại: ${res.status} ${await res.text()}`)
      const data = (await res.json()) as { id?: string }
      if (!data.id) throw new Error('Runway không trả về task id')
      return data.id
    },

    async poll(providerJobId: string): Promise<JobResult> {
      const res = await fetch(`${BASE_URL}/tasks/${providerJobId}`, { headers })
      if (!res.ok) return { status: 'failed', error: `Runway poll thất bại: ${res.status}` }
      const data = (await res.json()) as { status?: string; output?: string[]; failure?: string }

      switch (data.status) {
        case 'SUCCEEDED':
          return data.output?.[0]
            ? { status: 'succeeded', outputUrl: data.output[0] }
            : { status: 'failed', error: 'Thiếu output trả về' }
        case 'FAILED':
          return { status: 'failed', error: data.failure || 'Runway báo job thất bại' }
        case 'CANCELLED':
          return { status: 'cancelled' }
        case 'THROTTLED':
        case 'RUNNING':
        case 'PENDING':
        default:
          return { status: 'running' }
      }
    },

    async cancel(providerJobId: string): Promise<void> {
      await fetch(`${BASE_URL}/tasks/${providerJobId}`, { method: 'DELETE', headers })
    }
  }
}
