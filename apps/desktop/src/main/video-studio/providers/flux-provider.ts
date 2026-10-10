import type { VideoProvider, VideoJobParams, JobResult } from './types'

const BASE_URL = 'https://api.bfl.ml'

/** FLUX (Black Forest Labs) — model tạo ảnh open-weight phổ biến, chất lượng cao. Submit→poll thật (khác OpenAI Image/TTS — không đồng bộ). */
export function createFluxProvider(apiKey: string): VideoProvider {
  return {
    name: 'flux',

    async submit(params: VideoJobParams): Promise<string> {
      if (params.mode !== 'text-to-image') {
        throw new Error('FLUX chỉ hỗ trợ tạo ảnh (text-to-image), không tạo video')
      }
      const [w, h] =
        params.aspectRatio === '9:16' ? [768, 1344] : params.aspectRatio === '1:1' ? [1024, 1024] : [1344, 768]

      const res = await fetch(`${BASE_URL}/v1/flux-pro-1.1`, {
        method: 'POST',
        headers: { 'x-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: params.prompt, width: w, height: h })
      })
      if (!res.ok) throw new Error(`FLUX submit thất bại: ${res.status} ${await res.text()}`)
      const data = (await res.json()) as { id?: string }
      if (!data.id) throw new Error('FLUX không trả về request id')
      return data.id
    },

    async poll(providerJobId: string): Promise<JobResult> {
      const res = await fetch(`${BASE_URL}/v1/get_result?id=${providerJobId}`)
      if (!res.ok) return { status: 'failed', error: `FLUX poll thất bại: ${res.status}` }
      const data = (await res.json()) as { status?: string; result?: { sample?: string } }

      if (data.status === 'Ready') {
        return data.result?.sample
          ? { status: 'succeeded', outputUrl: data.result.sample }
          : { status: 'failed', error: 'Thiếu ảnh kết quả trả về' }
      }
      if (data.status === 'Error' || data.status === 'Content Moderated' || data.status === 'Request Moderated') {
        return { status: 'failed', error: `FLUX báo lỗi: ${data.status}` }
      }
      return { status: 'running' }
    }
  }
}
