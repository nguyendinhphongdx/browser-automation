import fs from 'fs'
import os from 'os'
import path from 'path'
import { pathToFileURL } from 'url'
import { v4 as uuid } from 'uuid'
import type { TTSProvider, TTSJobParams, JobResult } from './types'

const DEFAULT_VOICE = 'alloy'

/** Cùng kiểu đồng bộ như ElevenLabs — xem comment ở elevenlabs-provider.ts. */
export function createOpenAITTSProvider(apiKey: string): TTSProvider {
  const pending = new Map<string, string>()

  return {
    name: 'openai-tts',

    async submit(params: TTSJobParams): Promise<string> {
      const res = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'tts-1', input: params.text, voice: params.voiceId || DEFAULT_VOICE })
      })
      if (!res.ok) throw new Error(`OpenAI TTS thất bại: ${res.status} ${await res.text()}`)

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
