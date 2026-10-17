// Xoá các interaction Gemini đã được LƯU phía Google (Interactions API mặc định store=true).
// Lấy interaction_id từ sổ quota projects/<id>/usage.jsonl.
//
//   node scripts/delete-stored-interactions.mjs                 # chỉ liệt kê (không xoá)
//   node scripts/delete-stored-interactions.mjs --yes           # xoá mọi dự án
//   node scripts/delete-stored-interactions.mjs tiem-guong-that --yes
//
// Xoá là VĨNH VIỄN. Không ảnh hưởng file ảnh/video/âm thanh đã tải về máy.
import fs from 'node:fs'
import path from 'node:path'
import '../src/proxy.js'
import { GoogleGenAI } from '@google/genai'
import { config } from '../src/config.js'

const args = process.argv.slice(2)
const yes = args.includes('--yes')
const only = args.filter((a) => !a.startsWith('--'))
const projects = fs
  .readdirSync(config.projectsDir)
  .filter((d) => fs.existsSync(path.join(config.projectsDir, d, 'usage.jsonl')))
  .filter((d) => !only.length || only.includes(d))

const ai = new GoogleGenAI({ apiKey: config.apiKey })
let total = 0
let deleted = 0
for (const id of projects) {
  const dir = path.join(config.projectsDir, id)
  const doneFile = path.join(dir, 'deleted-interactions.txt')
  const done = new Set(fs.existsSync(doneFile) ? fs.readFileSync(doneFile, 'utf8').split('\n').filter(Boolean) : [])
  const ids = [
    ...new Set(
      fs
        .readFileSync(path.join(dir, 'usage.jsonl'), 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l).interaction_id)
        .filter((x) => x && !done.has(x))
    )
  ]
  total += ids.length
  console.log(`${id}: ${ids.length} interaction có thể còn lưu phía Google`)
  if (!yes) continue
  if (!config.apiKey) throw new Error('Thiếu GEMINI_API_KEY (key của đúng project đã tạo các interaction này)')
  for (const iid of ids) {
    try {
      await ai.interactions.delete(iid)
      deleted++
    } catch (err) {
      // 404 = đã hết hạn lưu hoặc vốn không lưu (store=false) → coi như xong.
      if (!/404|not.?found/i.test(String(err?.message))) {
        console.log(`  ✗ ${iid}: ${String(err.message).slice(0, 120)}`)
        continue
      }
    }
    fs.appendFileSync(doneFile, `${iid}\n`)
  }
}
console.log(yes ? `Đã xoá ${deleted}/${total} (phần còn lại đã hết hạn hoặc lỗi ở trên).` : `Tổng ${total}. Chạy lại với --yes để xoá.`)
