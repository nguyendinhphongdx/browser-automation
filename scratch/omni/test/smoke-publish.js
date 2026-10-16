// Kiểm tra bộ đăng bài offline: final.mp4 giả bằng ffmpeg, không gọi API.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

process.env.FILM_PROJECTS_DIR = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'film-publish-'))
const { createProject, updateProject, projectDir } = await import('../src/project.js')
const { buildPublishKit, readManifest, writeManifest } = await import('../src/publish.js')

const ff = (...a) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...a])
const probe = (f) => JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height', '-of', 'json', f]))
const assert = (ok, msg) => {
  if (!ok) throw new Error(msg)
  console.log(`  ✓ ${msg}`)
}

const p = createProject({ title: 'Sơn Tinh Thủy Tinh', style: 'hoạt hình 2D màu nước', aspect_ratio: '16:9' })
const out = path.join(projectDir(p.id), 'episodes/e01/output')
fs.mkdirSync(out, { recursive: true })
const DUR = 100
fs.writeFileSync(path.join(out, 'final.srt'), '1\n00:00:01,000 --> 00:00:03,000\nNgày xửa ngày xưa…\n')
ff('-f', 'lavfi', '-i', `testsrc2=size=1280x720:rate=30:duration=${DUR}`, '-f', 'lavfi', '-i', `sine=f=300:d=${DUR}`, '-i', path.join(out, 'final.srt'),
  '-map', '0:v', '-map', '1:a', '-map', '2:s', '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-c:s', 'mov_text', '-t', String(DUR), path.join(out, 'final.mp4'))
ff('-ss', '5', '-i', path.join(out, 'final.mp4'), '-frames:v', '1', '-pix_fmt', 'yuvj420p', path.join(out, 'cover.jpg'))

const starts = [0, 14, 31, 47, 63, 80].map((start, i) => ({ id: `s0${i + 1}`, start }))
await updateProject(p.id, (pr) => {
  pr.logline = 'Hai vị thần tranh tài cầu hôn Mị Nương'
  pr.bible = { ending: 'BÍ MẬT: Thủy Tinh thua mãi mãi' }
  pr.characters = [{ id: 'son-tinh', name: 'Sơn Tinh', role: 'nhân vật chính', appearance: 'x' }, { id: 'thuy-tinh', name: 'Thủy Tinh', role: 'phản diện', appearance: 'y' }]
  const scenes = starts.map((s, i) => ({ id: s.id, title: `Cảnh ${i + 1} <ok>`, image_prompt: 'x', duration_sec: 15, assets: {} }))
  pr.episodes = [
    { id: 'e01', number: 1, title: 'Kén rể', synopsis: 'Vua Hùng kén rể cho Mị Nương.', hook: 'Núi mọc lên giữa đêm', beats: ['Kén rể', 'Hai thần đến', 'Thách cưới'],
      cliffhanger: 'BÍ MẬT CLIFF', scenes,
      output: { video: 'episodes/e01/output/final.mp4', srt: 'episodes/e01/output/final.srt', cover: 'episodes/e01/output/cover.jpg', duration_sec: DUR, scene_starts: starts, stills_used: [], assembled_at: new Date().toISOString() } },
    { id: 'e02', number: 2, title: 'Giao tranh', scenes: [] }
  ]
})

const logs = []
const kit = await buildPublishKit(p.id, 'e01', { platforms: ['youtube', 'shorts', 'tiktok', 'reels', 'facebook'] }, (m) => logs.push(m))
console.log(JSON.stringify({ title: kit.title, hashtags: kit.hashtags, chapters: kit.chapters, platforms: kit.platforms, warnings: kit.warnings }, null, 2))

const m = readManifest(p.id, 'e01')
const yt = m.platforms.youtube
assert(yt.title === 'Sơn Tinh Thủy Tinh — Tập 1: Kén rể', 'tiêu đề mặc định')
assert(!/[<>]/.test(yt.description) && !/[<>]/.test(yt.chapters.map((c) => c.title).join('')), 'không có < > trong mô tả/chapter')
assert(!/BÍ MẬT/.test(fs.readFileSync(path.join(kit.dir, 'youtube.txt'), 'utf8') + fs.readFileSync(path.join(kit.dir, 'tiktok.txt'), 'utf8')), 'không lộ ending/cliffhanger')
assert(yt.chapters.length === 3 && yt.chapters[0].time === '0:00' && yt.chapters[0].title === 'Kén rể', `chapter theo beats: ${kit.chapters.join(' | ')}`)
assert(yt.chapters.every((c, i) => !i || c.start - yt.chapters[i - 1].start >= 10), 'mỗi chapter ≥ 10s')
assert(/0:00 Kén rể/.test(yt.description) && /#SonTinhThuyTinh/.test(yt.description) && /#hoathinh/.test(yt.description), 'mô tả có mục lục + hashtag')
assert(yt.visibility === 'private' && m.platforms.reels.visibility === 'draft', 'mặc định private / nháp')
assert(kit.warnings.some((w) => /made_for_kids/.test(w)), 'nhắc chốt made_for_kids')

const v = probe(kit.platforms.tiktok.file)
const vs = v.streams.find((s) => s.codec_type === 'video')
assert(vs.width === 720 && vs.height === 1280, `bản dọc 720x1280 (${vs.width}x${vs.height})`)
assert(Math.abs(Number(v.format.duration) - DUR) < 0.5, 'tiktok dùng bản dọc đủ tập')
assert(v.streams.some((s) => s.codec_type === 'subtitle'), 'bản dọc giữ track phụ đề mềm')
const teaser = probe(kit.platforms.reels.file)
assert(m.platforms.reels.teaser && Math.abs(Number(teaser.format.duration) - 80) < 0.5, `reels = teaser 80s cắt ở ranh giới cảnh (${teaser.format.duration}s)`)
assert(kit.platforms.shorts.file === kit.platforms.tiktok.file, 'shorts ≤ 3 phút dùng bản đủ tập')
for (const f of ['thumbnail.jpg', 'cover-vertical.jpg', 'captions.vi.srt', 'youtube.txt', 'shorts.txt', 'tiktok.txt', 'reels.txt', 'facebook.txt']) assert(fs.existsSync(path.join(kit.dir, f)), `có ${f}`)

// Chạy lại: không render lại, giữ uploads của publisher, áp chỉnh sửa đã lưu
m.uploads = { youtube: { status: 'published', url: 'https://youtu.be/abc' } }
writeManifest(p.id, 'e01', m)
await updateProject(p.id, (pr) => {
  pr.episodes[0].publish = { title: 'Kén rể — Sơn Tinh đối đầu Thủy Tinh', made_for_kids: false, chapters: [{ scene_id: 's01', title: 'Mở màn' }, { scene_id: 's03', title: 'Thách cưới' }, { scene_id: 's05', title: 'Lên đường' }] }
})
logs.length = 0
const again = await buildPublishKit(p.id, 'e01', { platforms: ['youtube', 'shorts', 'tiktok', 'reels'] }, (x) => logs.push(x))
assert(logs.length === 0, 'chạy lại không render lại bản dọc')
const m2 = readManifest(p.id, 'e01')
assert(m2.uploads.youtube.url === 'https://youtu.be/abc', 'giữ uploads khi chạy lại')
assert(m2.platforms.youtube.title === 'Kén rể — Sơn Tinh đối đầu Thủy Tinh' && m2.platforms.youtube.made_for_kids === false, 'áp tiêu đề + made_for_kids đã chốt')
assert(again.chapters.join('|') === '0:00 Mở màn|0:31 Thách cưới|1:03 Lên đường', `chapter đã chốt: ${again.chapters.join(' | ')}`)
assert(!again.warnings.some((w) => /made_for_kids/.test(w)), 'hết nhắc made_for_kids')

// Tập 2 thấy link tập 1 đã đăng
await updateProject(p.id, (pr) => {
  pr.episodes[1].output = { ...pr.episodes[0].output, scene_starts: undefined }
  pr.episodes[1].scenes = pr.episodes[0].scenes
})
const e2 = await buildPublishKit(p.id, 'e02', { platforms: ['youtube'] })
const d2 = readManifest(p.id, 'e02').platforms.youtube.description
assert(/◀ Tập 1: Kén rể — https:\/\/youtu.be\/abc/.test(d2), 'tập 2 có link tập trước')
assert(e2.warnings.some((w) => /ƯỚC TÍNH/.test(w)), 'phim cũ không có scene_starts → chapter ước tính + cảnh báo')

console.log(`OK — ${kit.dir}`)
