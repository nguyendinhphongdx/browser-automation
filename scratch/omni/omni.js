// Script thử nhanh model video omni (gốc của dự án). Dùng: GEMINI_API_KEY=... node omni.js
import { GoogleGenAI } from '@google/genai'
import fs from 'fs'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

const res = await ai.interactions.create({
  model: 'gemini-omni-1.1-flash',
  input: 'Songoku biến từ siêu Saiyan cấp 1, 2, 3, 4, lần lượt từng cấp mỗi cấp nhân vật nói rằng đây là trạng thái cấp đó, để nhân vật nói tiếng việt',
  response_format: { type: 'video', aspect_ratio: '16:9', resolution: '720p', duration: '20s' },
})

fs.writeFileSync('out.mp4', Buffer.from(res.output_video.data, 'base64'))
