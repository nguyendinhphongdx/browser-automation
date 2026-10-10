import fs from 'fs'
import os from 'os'
import path from 'path'
import { pathToFileURL } from 'url'
import { v4 as uuid } from 'uuid'
import type { TTSProvider, TTSJobParams, JobResult } from './types'

const BASE_URL = 'https://api.elevenlabs.io/v1'
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM' // "Rachel" — giọng mặc định của ElevenLabs

/**
 * ElevenLabs trả audio ngay trong response (đồng bộ), không có khái niệm
 * job/poll như video. Để khớp interface TTSProvider dùng chung job-runner.ts
 * với video, submit() làm luôn việc thật + ghi file tạm, poll() xác nhận
 * ngay là đã xong — vòng lặp runProviderJob() sẽ thoát ở lượt poll đầu tiên.
 */
export function createElevenLabsProvider(apiKey: string): TTSProvider {
  const pending = new Map<string, string>() // jobId -> local file path tạm

  return {
    name: 'elevenlabs',

    async submit(params: TTSJobParams): Promise<string> {
      const voiceId = params.voiceId || DEFAULT_VOICE_ID
      const res = await fetch(`${BASE_URL}/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: params.text, model_id: 'eleven_multilingual_v2' })
      })
      if (!res.ok) throw new Error(`ElevenLabs thất bại: ${res.status} ${await res.text()}`)

      const buffer = Buffer.from(await res.arrayBuffer())
      const jobId = uuid()
      const filePath = path.join(os.tmpdir(), `video-studio-tts-${jobId}.mp3`)
      fs.writeFileSync(filePath, buffer)
      pending.set(jobId, filePath)
      return jobId
    },

    async poll(providerJobId: string): Promise<JobResult> {
      const filePath = pending.get(providerJobId)
      if (!filePath) return { status: 'failed', error: 'Không tìm thấy job TTS này (có thể app đã restart)' }
      return { status: 'succeeded', outputUrl: pathToFileURL(filePath).toString() }
    }
  }
}
