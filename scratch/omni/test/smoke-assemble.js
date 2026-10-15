// Kiểm tra bước dựng phim offline: asset giả bằng ffmpeg, không gọi API.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

process.env.FILM_PROJECTS_DIR = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'film-smoke-'))
const { createProject, updateProject, projectDir, sceneDir } = await import('../src/project.js')
const { assembleEpisode } = await import('../src/pipeline.js')
const { layoutLines, probe } = await import('../src/media.js')

const ff = (...a) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...a])
const p = createProject({ title: 'Smoke Test', aspect_ratio: '16:9', audio_mode: 'tts' })
const dir = projectDir(p.id)
const scene = (id) => sceneDir(p.id, 'e01', id)

// s01: video 1920x1080 25fps có tiếng gốc + 2 câu "thoại" ; s02: chỉ ảnh (Ken Burns) + thoại ; s03: video không thoại
const s1 = scene('s01'), s2 = scene('s02'), s3 = scene('s03')
ff('-f', 'lavfi', '-i', 'testsrc2=size=1920x1080:rate=25:duration=4', '-f', 'lavfi', '-i', 'sine=f=200:d=4', '-shortest', path.join(s1, 'video.mp4'))
ff('-f', 'lavfi', '-i', 'sine=f=440:d=1.5', path.join(s1, 'line-01.wav'))
ff('-f', 'lavfi', '-i', 'sine=f=660:d=2.0', path.join(s1, 'line-02.wav'))
ff('-f', 'lavfi', '-i', 'mandelbrot=size=1024x1024', '-frames:v', '1', path.join(s2, 'image.png'))
ff('-f', 'lavfi', '-i', 'sine=f=550:d=2.5', path.join(s2, 'line-01.wav'))
ff('-f', 'lavfi', '-i', 'testsrc=size=1280x720:rate=30:duration=5', path.join(s3, 'video.mp4'))
fs.mkdirSync(path.join(dir, 'episodes/e01/music'))
ff('-f', 'lavfi', '-i', 'sine=f=110:d=3', path.join(dir, 'episodes/e01/music', 'music.wav'))

const a1 = await layoutLines({ lines: [{ file: path.join(s1, 'line-01.wav'), text: 'Xin chào, tôi là câu thoại đầu tiên.' }, { file: path.join(s1, 'line-02.wav'), text: 'Và đây là câu thứ hai dài hơn một chút để thử ngắt dòng phụ đề.', pause_before: 0.5 }], outFile: path.join(s1, 'audio.wav') })
const a2 = await layoutLines({ lines: [{ file: path.join(s2, 'line-01.wav'), text: 'Cảnh hai chỉ có ảnh tĩnh.' }], outFile: path.join(s2, 'audio.wav') })
const tl = (r) => r.timeline.map((l) => ({ text: l.text, start: l.start, end: l.end }))

const S = (id, f) => `episodes/e01/scenes/${id}/${f}`
await updateProject(p.id, (pr) => {
  pr.characters = [{ id: 'an', name: 'An', appearance: 'x', voice: 'Kore' }]
  pr.episodes = [{ id: 'e01', number: 1, title: 'Tập 1', script: '', music: { prompt: 'test', file: 'episodes/e01/music/music.wav' }, scenes: [
    { id: 's01', image_prompt: 'x', lines: [{ speaker: 'narrator', text: 'a' }], assets: { video: S('s01', 'video.mp4'), video_duration: 4, audio: S('s01', 'audio.wav'), audio_duration: a1.duration, timeline: tl(a1) } },
    { id: 's02', image_prompt: 'x', lines: [{ speaker: 'narrator', text: 'b' }], transition: { type: 'dissolve', duration: 0.8 }, assets: { image: S('s02', 'image.png'), audio: S('s02', 'audio.wav'), audio_duration: a2.duration, timeline: tl(a2) } },
    // cảnh native: An nói trong khung hình → phụ đề ước lượng
    { id: 's03', image_prompt: 'x', audio_mode: 'native', characters: ['an'], lines: [{ speaker: 'an', text: 'Cảnh ba dùng tiếng gốc của video.' }], transition: { type: 'cut' }, assets: { video: S('s03', 'video.mp4'), video_duration: 5 } },
    { id: 's04', image_prompt: 'x', transition: { type: 'fadeblack', duration: 1 }, duration_sec: 3, assets: { image: S('s02', 'image.png') } }
  ] }]
})

let threw = false
try { await assembleEpisode(p.id, 'e01', {}) } catch (e) { console.log("  first error:", e.message); threw = /allow_stills/.test(e.message) }
if (!threw) throw new Error('Phải từ chối ghép khi thiếu video mà không có allow_stills')

const out = await assembleEpisode(p.id, 'e01', { allowStills: true }, (m) => console.log('  ·', m))
const info = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height', '-of', 'json', out.video_abs]))
console.log(JSON.stringify({ ...out, probe: info }, null, 2))
console.log(fs.readFileSync(out.srt_abs, 'utf8'))

const expected = (a1.duration + 0.8) + (0.8 + a2.duration) + 5 + 3 - 0.8 - 1 // s4 bị kéo lên ≥ dIn+dOut+1 = 2s nên giữ 3s
const actual = Number(info.format.duration)
if (Math.abs(actual - out.duration_sec) > 0.15 || Math.abs(actual - expected) > 0.15) throw new Error(`Độ dài file ${actual} ≠ timeline ${out.duration_sec} / dự kiến ${expected}`)
console.log(`OK — dự kiến ~${expected.toFixed(2)}s, thực tế ${actual}s. Project: ${dir}`)
