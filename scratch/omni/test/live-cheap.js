// Gọi thật (rẻ): 1 câu TTS + 1 ảnh. Cần GEMINI_API_KEY.
import fs from 'node:fs'
import path from 'node:path'
import { generateSpeech, generateImage } from '../src/gemini.js'
import { probe } from '../src/media.js'
const out = fs.mkdtempSync(path.join(process.env.TMPDIR, 'film-live-'))
const t = Date.now()
await Promise.allSettled([
  generateSpeech({ text: 'Ngày xửa ngày xưa, ở vùng núi Tản Viên, có một chàng trai tên là Sơn Tinh.', voice: 'Charon', style: 'trầm ấm kể chuyện', language: 'vi', outFile: path.join(out, 'tts.wav') })
    .then(async (f) => console.log('TTS OK', f, (await probe(f)).duration.toFixed(2) + 's'), (e) => console.log('TTS FAIL', e.message.slice(0, 400))),
  generateImage({ prompt: 'Cinematic film still, anime 2D watercolor: a young mountain god in green cloak on a misty peak at dawn. No text.', aspectRatio: '16:9', outBase: path.join(out, 'img') })
    .then((f) => console.log('IMG OK', f, fs.statSync(f).size, 'bytes'), (e) => console.log('IMG FAIL', e.message.slice(0, 400)))
])
console.log(`${((Date.now() - t) / 1000).toFixed(1)}s`)
