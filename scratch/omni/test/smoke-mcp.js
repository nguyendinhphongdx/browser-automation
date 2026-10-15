// Kết nối MCP server qua stdio như 1 agent thật và đi hết luồng tool (không gọi API sinh — GEMINI_API_KEY rỗng).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const dir = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'film-mcp-'))
const client = new Client({ name: 'smoke', version: '1' })
await client.connect(new StdioClientTransport({ command: 'node', args: ['src/server.js'], env: { ...process.env, FILM_PROJECTS_DIR: dir, GEMINI_API_KEY: '', FILM_DASHBOARD_PORT: '0' }, stderr: 'ignore' }))
const raw = (name, args = {}) => client.callTool({ name, arguments: args })
const call = async (name, args) => {
  const r = await raw(name, args)
  const text = r.content[0].text
  if (r.isError) throw new Error(`${name}: ${text}`)
  return text.startsWith('{') || text.startsWith('[') ? JSON.parse(text) : text
}
const expectError = async (name, args, re) => {
  const r = await raw(name, args)
  if (!r.isError || !re.test(r.content[0].text)) throw new Error(`${name} phải lỗi khớp ${re}, nhận: ${r.content[0].text.slice(0, 200)}`)
  console.log(`  ✓ ${name} chặn đúng: ${r.content[0].text.slice(0, 100)}`)
}

console.log('tools:', (await client.listTools()).tools.map((t) => t.name).join(', '))
console.log('prompts:', (await client.listPrompts()).prompts.map((p) => p.name).join(', '))

const { project_id } = await call('project_create', { title: 'Sơn Tinh Thủy Tinh', style: 'anime 2D, màu nước' })
await call('series_bible_save', {
  project_id, premise: 'Hai vị thần tranh tài cầu hôn Mị Nương', story_arc: 'cầu hôn → thách cưới → giao tranh',
  music: { prompt: 'sáo trúc, trống đồng' },
  episodes: [{ title: 'Kén rể', synopsis: 'Vua Hùng kén rể' }, { title: 'Giao tranh', synopsis: 'Thủy Tinh dâng nước' }]
})
await call('characters_save', {
  project_id,
  characters: [
    { name: 'Sơn Tinh', appearance: 'thanh niên vạm vỡ, áo choàng xanh lá', personality: 'điềm tĩnh, kiên định', accessories: [{ name: 'gậy thần', description: 'gỗ lim khắc hoa văn núi' }] },
    { name: 'Thủy Tinh', appearance: 'tóc dài xanh biển, giáp vảy cá', personality: 'nóng nảy, kiêu ngạo' }
  ],
  locations: [{ name: 'Đỉnh Tản Viên', description: 'đỉnh núi mây phủ, rừng thông' }]
})
await expectError('episode_script_save', { project_id, episode_id: 'e01', scenes: [{ image_prompt: 'x' }] }, /HỎI NGƯỜI DÙNG/)
await expectError('episode_script_save', { project_id, episode_id: 'e01', duration: 10, scenes: [{ image_prompt: 'x' }] }, /8/)
const ep = await call('episode_script_save', {
  project_id, episode_id: 'e01', duration: 'default', script: '# Tập 1\n...',
  scenes: [
    { location: 'dinh-tan-vien', image_prompt: 'toàn cảnh núi lúc bình minh', lines: [{ speaker: 'narrator', text: 'Ngày xửa ngày xưa…' }] },
    { location: 'Đỉnh Tản Viên', characters: ['Sơn Tinh'], image_prompt: 'trung cảnh Sơn Tinh trên đỉnh núi', lines: [{ speaker: 'son-tinh', text: 'Ta sẽ bảo vệ nơi này!' }], transition: { type: 'dissolve', duration: 0.8 } },
    { characters: ['son-tinh'], image_prompt: 'cận cảnh', lines: [{ speaker: 'thuy-tinh', text: 'Ngươi dám sao?' }] }
  ]
})
console.log('e01 duration:', JSON.stringify(ep.episode.duration), '| warn:', ep.episode.next_steps[0].slice(0, 110))
if (ep.episode.duration.target_sec !== 180 || !/NGẮN/.test(ep.episode.next_steps[0])) throw new Error('phải chốt 3 phút và cảnh báo kịch bản quá ngắn')
const e2 = await call('episode_script_save', { project_id, episode_id: 'e02', duration: 5, scenes: [{ image_prompt: 'x', duration_sec: 8 }] })
if (e2.episode.duration.target_sec !== 300) throw new Error('e02 phải 5 phút')
console.log('  ✓ e02 chọn 5 phút:', e2.episode.duration.target)
console.log('e01 audio modes:', ep.episode.scenes.map((s) => `${s.id}=${s.audio_mode}`).join(' '), '| next:', ep.episode.next_steps)
if (ep.episode.scenes.map((s) => s.audio_mode).join() !== 'tts,native,tts') throw new Error('auto audio mode sai')

const pv = await call('prompt_preview', { project_id, episode_id: 'e01', scene_id: 's02' })
console.log('preview image_prompt:', pv.image_prompt)
console.log('preview video_prompt:', pv.video_prompt, '| dur', pv.video_duration_sec)

await expectError('episode_script_save', { project_id, episode_id: 'e01', mode: 'append', scenes: [{ image_prompt: 'x', lines: [{ speaker: 'Mị Nương', text: 'hi' }] }] }, /Mị Nương/)
await expectError('episode_videos_generate', { project_id, episode_id: 'e01', wait_sec: 5 }, /.*/).catch(async () => {
  const r = await call('episode_videos_generate', { project_id, episode_id: 'e01', wait_sec: 5 })
  if (r.status !== 'failed' || !/chưa đủ storyboard/.test(r.error)) throw new Error('videos phải bị chặn khi thiếu storyboard: ' + JSON.stringify(r))
  console.log('  ✓ episode_videos_generate chặn đúng:', r.error.slice(0, 90))
})

// Giả lập storyboard đã sinh bằng asset_import, duyệt, rồi review trả ảnh
const img = path.join(dir, 'fake.png')
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'mandelbrot=size=1280x720', '-frames:v', '1', img])
for (const s of ['s01', 's02', 's03']) await call('asset_import', { project_id, kind: 'scene_image', episode_id: 'e01', target: s, file_path: img })
await expectError('storyboard_approve', { project_id, episode_id: 'e03' }, /Không có tập/)
const unapproved = await call('episode_videos_generate', { project_id, episode_id: 'e01', wait_sec: 5 })
if (!/chưa duyệt/.test(unapproved.error)) throw new Error('phải chặn khi chưa duyệt')
console.log('  ✓ videos chặn khi storyboard chưa duyệt')
const review = await raw('storyboard_review', { project_id, episode_id: 'e01' })
console.log('storyboard_review blocks:', review.content.map((c) => c.type).join(','))
await call('storyboard_approve', { project_id, episode_id: 'e01' })
// Sửa prompt ảnh → mất duyệt
const upd = await call('scene_update', { project_id, episode_id: 'e01', scene_id: 's02', changes: { image_prompt: 'góc thấp' } })
console.log('sau scene_update s02 approved =', upd.scene.approved, 'image =', upd.scene.assets.image)

await call('asset_import', { project_id, kind: 'scene_image', episode_id: 'e01', target: 's02', file_path: img })
const draft = await call('episode_assemble', { project_id, episode_id: 'e01', allow_stills: true, music: false, wait_sec: 55 })
console.log('assemble nháp:', draft.status, draft.error || draft.result?.duration_sec + 's')
if (draft.status !== 'succeeded') throw new Error('ghép nháp phải thành công')
const overview = await call('project_get', { project_id })
console.log('project next_steps:', overview.next_steps)
await client.close()
