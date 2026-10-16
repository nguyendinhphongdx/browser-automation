// Gọi thật (rẻ): kiểm tra sổ quota ghi đúng — 1 ảnh, 2 lần TTS cùng 1 câu (lần 2 = sinh lại), 1 lần lỗi.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
process.env.FILM_PROJECTS_DIR = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'film-usage-'))
const { createProject, projectDir } = await import('../src/project.js')
const g = await import('../src/gemini.js')
const { usageReport } = await import('../src/usage.js')
const p = createProject({ title: 'Usage' })
const dir = projectDir(p.id)
const u = (extra) => ({ projectId: p.id, episode: 'e01', scene: 's01', ...extra })
await g.generateImage({ prompt: 'a red apple on a table, watercolor', aspectRatio: '16:9', outBase: path.join(dir, 'img'), usage: u({ purpose: 'storyboard' }) })
for (let i = 0; i < 2; i++) await g.generateSpeech({ text: 'Người thứ hai là Thủy Tinh.', voice: 'Gacrux', language: 'vi', outFile: path.join(dir, `t${i}.wav`), usage: u({ purpose: 'line_tts', target: 'line-1' }) })
await g.generateVideo({ prompt: 'x', aspectRatio: '16:9', resolution: '720p', durationSec: 30, outFile: path.join(dir, 'v.mp4'), usage: u({ purpose: 'scene_video' }) }).catch((e) => console.log('lỗi có chủ đích:', e.message.slice(0, 80)))
console.log(fs.readFileSync(path.join(dir, 'usage.jsonl'), 'utf8').split('\n')[1])
console.log(JSON.stringify(usageReport(p.id, { groupBy: 'kind' }), null, 2))
