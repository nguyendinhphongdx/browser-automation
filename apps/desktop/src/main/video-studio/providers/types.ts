export type JobStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled'

export interface JobResult {
  status: JobStatus
  progressPct?: number
  outputUrl?: string
  error?: string
}

export interface VideoJobParams {
  mode: 'text-to-image' | 'text-to-video' | 'image-to-video'
  prompt?: string
  imagePath?: string
  /** Frame cuối của cảnh trước, dùng để video tiếp theo khớp chuyển động. */
  continuityImagePath?: string
  durationSec?: number
  aspectRatio?: string
}

export interface TTSJobParams {
  text: string
  voiceId?: string
}

export interface VideoProvider {
  readonly name: string
  submit(params: VideoJobParams): Promise<string>
  poll(providerJobId: string): Promise<JobResult>
  cancel?(providerJobId: string): Promise<void>
}

export interface TTSProvider {
  readonly name: string
  submit(params: TTSJobParams): Promise<string>
  poll(providerJobId: string): Promise<JobResult>
  cancel?(providerJobId: string): Promise<void>
}
