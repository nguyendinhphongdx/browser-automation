import type { VideoProvider, VideoJobParams, JobResult } from './types'

/**
 * Dùng polling thường qua /history, KHÔNG dùng WebSocket /ws — tránh thêm
 * dependency `ws` chỉ để có progress đẹp hơn 1 chút, không đáng so với 2
 * provider kia cũng chỉ poll.
 */
export function createComfyUIProvider(baseUrl: string): VideoProvider {
  const base = baseUrl.replace(/\/$/, '')

  return {
    name: 'comfyui',

    async submit(params: VideoJobParams): Promise<string> {
      // Đồ thị ComfyUI tối giản: 1 node text-to-video đơn giản hoá qua workflow
      // mặc định — người dùng có thể thay bằng workflow JSON tuỳ chỉnh sau này.
      const prompt = buildMinimalPrompt(params)
      const res = await fetch(`${base}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })
      if (!res.ok) throw new Error(`ComfyUI submit thất bại: ${res.status} ${await res.text()}`)
      const data = (await res.json()) as { prompt_id?: string }
      if (!data.prompt_id) throw new Error('ComfyUI không trả về prompt_id')
      return data.prompt_id
    },

    async poll(providerJobId: string): Promise<JobResult> {
      const res = await fetch(`${base}/history/${providerJobId}`)
      if (!res.ok) return { status: 'failed', error: `ComfyUI poll thất bại: ${res.status}` }
      const data = (await res.json()) as Record<string, ComfyUIHistoryEntry>
      const entry = data[providerJobId]
      if (!entry) return { status: 'running' }

      if (entry.status?.status_str === 'error') return { status: 'failed', error: 'ComfyUI báo lỗi khi chạy' }
      if (!entry.status?.completed) return { status: 'running' }

      const outputUrl = extractFirstVideoUrl(entry.outputs, base)
      return outputUrl ? { status: 'succeeded', outputUrl } : { status: 'failed', error: 'Không tìm thấy output video' }
    }
  }
}

function buildMinimalPrompt(params: VideoJobParams): Record<string, unknown> {
  // Workflow placeholder — cấu trúc đồ thị ComfyUI thật phụ thuộc vào các
  // node/model đã cài trên instance của người dùng, không cố định được ở
  // đây. Giữ tối giản, hoàn thiện khi có 1 ComfyUI thật để test (Phase F/H).
  return {
    '1': { class_type: 'CLIPTextEncode', inputs: { text: params.prompt || '' } }
  }
}

interface ComfyUIOutputFile {
  filename: string
  subfolder?: string
  type?: string
}

interface ComfyUIHistoryEntry {
  status?: { completed?: boolean; status_str?: string }
  outputs?: Record<string, { videos?: ComfyUIOutputFile[]; gifs?: ComfyUIOutputFile[] }>
}

function extractFirstVideoUrl(outputs: ComfyUIHistoryEntry['outputs'], base: string): string | undefined {
  if (!outputs) return undefined
  for (const nodeOutput of Object.values(outputs)) {
    const file = (nodeOutput.videos || nodeOutput.gifs)?.[0]
    if (file?.filename) {
      const params = new URLSearchParams({ filename: file.filename, subfolder: file.subfolder || '', type: file.type || 'output' })
      return `${base}/view?${params.toString()}`
    }
  }
  return undefined
}
