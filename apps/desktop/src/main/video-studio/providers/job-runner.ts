import type { JobResult, JobStatus } from './types'

const TERMINAL_STATUSES: JobStatus[] = ['succeeded', 'failed', 'cancelled']

export interface RunProviderJobOptions {
  pollIntervalMs?: number
  maxWaitMs?: number
  onProgress?: (result: JobResult) => void
}

/**
 * Vòng lặp submit-rồi-poll dùng chung cho mọi provider (video lẫn TTS) —
 * không viết lặp lại ở từng node. Quy tắc an toàn (học từ OpenMontage):
 * KHÔNG BAO GIỜ tự động retry bước submit() — 1 lần gọi là 1 lần trả phí,
 * retry ngầm có thể tính tiền 2 lần cho cùng 1 video/audio. Chỉ poll() mới
 * được retry/backoff (đọc trạng thái, miễn phí, vô hại khi gọi lại).
 */
export async function runProviderJob<TParams>(
  provider: { submit(params: TParams): Promise<string>; poll(id: string): Promise<JobResult> },
  params: TParams,
  opts: RunProviderJobOptions = {}
): Promise<JobResult> {
  const providerJobId = await provider.submit(params)

  const deadline = Date.now() + (opts.maxWaitMs ?? 10 * 60_000)
  let interval = opts.pollIntervalMs ?? 5000

  while (Date.now() < deadline) {
    const result = await provider.poll(providerJobId)
    opts.onProgress?.(result)
    if (TERMINAL_STATUSES.includes(result.status)) return result
    await new Promise((resolve) => setTimeout(resolve, interval))
    interval = Math.min(interval * 1.5, 30_000)
  }

  throw new Error('Video job timed out waiting for provider')
}

export { TERMINAL_STATUSES }
