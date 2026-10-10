import fs from 'fs'
import os from 'os'
import path from 'path'
import { pathToFileURL } from 'url'
import { v4 as uuid } from 'uuid'
import type { TTSProvider, TTSJobParams, JobResult } from './types'

const DEFAULT_VOICE = 'vi-VN-Chirp3-HD-Achernar'

/** Cùng kiểu đồng bộ — xem comment ở elevenlabs-provider.ts. Google trả audio dạng base64 trong JSON, không phải raw bytes. */
export function createGoogleTTSProvider(apiKey: string): TTSProvider {
  const pending = new Map<string, string>()

  return {
    name: 'google-tts',

    async submit(params: TTSJobParams): Promise<string> {
      const voiceName = params.voiceId || DEFAULT_VOICE
      const languageCode = voiceName.split('-').slice(0, 2).join('-')
      const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: params.text },
          voice: { languageCode, name: voiceName },
          audioConfig: { audioEncoding: 'MP3' }
        })
      })
      if (!res.ok) throw new Error(`Google TTS thất bại: ${res.status} ${await res.text()}`)

      const data = (await res.json()) as { audioContent?: string }
      if (!data.audioContent) throw new Error('Google TTS không trả về audioContent')

      const buffer = Buffer.from(data.audioContent, 'base64')
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
