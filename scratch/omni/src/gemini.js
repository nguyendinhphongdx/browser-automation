import fs from 'node:fs'
import path from 'node:path'
import './proxy.js'
import { GoogleGenAI } from '@google/genai'
import { config } from './config.js'
import { pcmToWav, probe, transcodeAudio } from './media.js'
import { track } from './usage.js'

let client = null
function ai() {
  if (!config.apiKey) throw new Error('Thiếu GEMINI_API_KEY — đặt biến môi trường này trong cấu hình MCP server.')
  client ??= new GoogleGenAI({ apiKey: config.apiKey })
  return client
}

const MIME_EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export function imagePart(file) {
  const ext = path.extname(file).slice(1).toLowerCase()
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
  return { type: 'image', mime_type: mime, data: fs.readFileSync(file).toString('base64') }
}

async function contentBytes(content, what) {
  if (content?.data) return Buffer.from(content.data, 'base64')
  if (content?.uri) {
    const res = await fetch(content.uri, { headers: { 'x-goog-api-key': config.apiKey } })
    if (!res.ok) throw new Error(`Tải ${what} từ ${content.uri} thất bại: HTTP ${res.status}`)
    return Buffer.from(await res.arrayBuffer())
  }
  throw new Error(`Model không trả về ${what}`)
}

/**
 * Bọc 1 lần sinh: ghi sổ quota (usage.jsonl) cả khi thành công lẫn thất bại.
 * `work(attempt)` trả { res, output } — output là đơn vị đã tạo ra (images / video_sec / audio_sec...).
 */
async function tracked(usage, kind, model, request, work) {
  const t = track(usage, { kind, model, request })
  try {
    const { res, output, value } = await work(t.attempt)
    t.ok(res, output)
    return value
  } catch (err) {
    t.fail(err)
    throw err
  }
}

/** Lỗi 429/503 của Gemini thường hết sau vài giây — thử lại có backoff thay vì fail cả job. */
async function withRetry(label, fn, attempts = 3, onAttempt = () => {}) {
  for (let i = 1; ; i++) {
    onAttempt()
    try {
      return await fn()
    } catch (err) {
      const msg = String(err?.message || err)
      const transient = /\b(429|500|502|503|504)\b|RESOURCE_EXHAUSTED|UNAVAILABLE|ECONNRESET|fetch failed/i.test(msg)
      if (!transient || i >= attempts) throw new Error(`${label}: ${msg}`)
      await sleep(4000 * i)
    }
  }
}

/** Sinh 1 ảnh; `references` là ảnh tham chiếu (nhân vật) để giữ nhất quán. Trả về đường dẫn file đã ghi (đuôi theo mime thật). */
export async function generateImage({ prompt, aspectRatio, references = [], outBase, usage }) {
  const model = config.models.image
  const input = references.length ? [{ type: 'text', text: prompt }, ...references.map(imagePart)] : prompt
  return tracked(usage, 'image', model, { aspect_ratio: aspectRatio, references: references.length }, async (attempt) => {
    const res = await withRetry('Sinh ảnh', () => ai().interactions.create({ model, input, response_format: { type: 'image', aspect_ratio: aspectRatio } }), 3, attempt)
    const out = res.output_image
    const buf = await contentBytes(out, `ảnh (model "${model}")`)
    const file = `${outBase}.${MIME_EXT[out?.mime_type] || 'jpg'}`
    fs.writeFileSync(file, buf)
    return { res, output: { images: 1, bytes: buf.length }, value: file }
  })
}

/**
 * Sinh video từ ảnh khung đầu (image_to_video) hoặc chỉ từ text.
 * Video sinh lâu (vài phút) nên chạy `background: true` rồi poll; nếu model
 * trả kết quả ngay trong response thì dùng luôn.
 */
export async function generateVideo({ prompt, image, aspectRatio, resolution, durationSec, outFile, usage }) {
  const input = image ? [{ type: 'text', text: prompt }, imagePart(image)] : prompt
  const request = {
    model: config.models.video,
    input,
    response_format: {
      type: 'video',
      aspect_ratio: aspectRatio,
      resolution,
      duration: `${durationSec}s`
    },
    ...(image ? { generation_config: { video_config: { task: 'image_to_video' } } } : {})
  }
  const meta = { aspect_ratio: aspectRatio, resolution, duration_sec: durationSec, task: image ? 'image_to_video' : 'text_to_video' }

  return tracked(usage, 'video', config.models.video, meta, async (attempt) => {
    let res = await withRetry(
      'Sinh video',
      async () => {
        try {
          return await ai().interactions.create({ ...request, background: true })
        } catch (err) {
          // Model không hỗ trợ background → gọi đồng bộ.
          if (/background/i.test(String(err?.message))) return ai().interactions.create(request)
          throw err
        }
      },
      3,
      attempt
    )

    const deadline = Date.now() + config.videoTimeoutMs
    while (!res.output_video && ['in_progress', 'queued'].includes(res.status)) {
      if (Date.now() > deadline) throw new Error(`Sinh video quá ${Math.round(config.videoTimeoutMs / 60000)} phút (interaction ${res.id})`)
      await sleep(8000)
      res = await withRetry('Poll video', () => ai().interactions.get(res.id))
    }
    if (res.status && !['completed', undefined].includes(res.status) && !res.output_video) {
      throw new Error(`Sinh video kết thúc với trạng thái "${res.status}"`)
    }
    fs.writeFileSync(outFile, await contentBytes(res.output_video, `video (model "${config.models.video}")`))
    return { res, output: { video_sec: Number((await probe(outFile)).duration.toFixed(2)) }, value: outFile }
  })
}

/** Đọc 1 câu thoại/lời dẫn bằng 1 giọng, ghi ra WAV. */
export async function generateSpeech({ text, voice, style, language, outFile, usage }) {
  // Model TTS đọc to MỌI câu chỉ dẫn đặt trước thoại (kể cả "Say ...:"), không hỗ trợ
  // system_instruction, và đọc to cả thẻ [..] viết tiếng Việt (đã đo: câu 3.4s → 7.6s).
  // Chỉ thẻ [..] TIẾNG ANH được hiểu là chỉ đạo giọng mà không bị đọc → bỏ style không phải ASCII.
  const tag = style && /^[\x20-\x7E]+$/.test(style) ? style.replace(/[[\]]/g, '') : null
  return tracked(usage, 'tts', config.models.tts, { voice: voice || 'Kore', style: tag }, async (attempt) => {
    const res = await withRetry(
      'Sinh giọng đọc',
      () =>
        ai().interactions.create({
          model: config.models.tts,
          input: tag ? `[${tag}] ${text}` : text,
          generation_config: { speech_config: [{ voice: voice || 'Kore', language }] },
          response_format: { type: 'audio', mime_type: 'audio/wav' }
        }),
      3,
      attempt
    )
    const out = res.output_audio
    const buf = await contentBytes(out, `âm thanh (model "${config.models.tts}")`)
    const mime = String(out?.mime_type || '')
    const isWav = buf.subarray(0, 4).toString() === 'RIFF'
    if (/l16|pcm/i.test(mime) || (!mime.includes('wav') && !isWav)) {
      const rate = Number(/rate=(\d+)/.exec(mime)?.[1] || out?.sample_rate || 24000)
      await pcmToWav(buf, outFile, rate, out?.channels || 1)
    } else if (isWav || mime.includes('wav')) {
      fs.writeFileSync(outFile, buf)
    } else {
      await transcodeAudio(buf, outFile)
    }
    return { res, output: { audio_sec: Number((await probe(outFile)).duration.toFixed(2)), chars: text.length }, value: outFile }
  })
}

/** Nhạc nền không lời (Lyria). */
export async function generateMusic({ prompt, outFile, usage }) {
  return tracked(usage, 'music', config.models.music, {}, async (attempt) => {
    const res = await withRetry(
      'Sinh nhạc',
      () => ai().interactions.create({ model: config.models.music, input: prompt, response_format: { type: 'audio', mime_type: 'audio/mp3' } }),
      3,
      attempt
    )
    const buf = await contentBytes(res.output_audio, `nhạc (model "${config.models.music}")`)
    await transcodeAudio(buf, outFile)
    return { res, output: { audio_sec: Number((await probe(outFile)).duration.toFixed(2)) }, value: outFile }
  })
}
