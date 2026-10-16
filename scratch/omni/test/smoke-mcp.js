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
// Hồ sơ kịch tính + sửa giọng không được làm mất character sheet
{
  const f = path.join(dir, project_id, 'project.json')
  const m = JSON.parse(fs.readFileSync(f, 'utf8'))
  m.characters.find((c) => c.id === 'son-tinh').reference_image = 'characters/son-tinh.jpg'
  fs.writeFileSync(f, JSON.stringify(m))
  await call('characters_save', { project_id, characters: [{ id: 'son-tinh', name: 'Sơn Tinh', appearance: 'thanh niên vạm vỡ, áo choàng xanh lá', want: 'cưới Mị Nương', flaw: 'quá nhẫn nhịn', speech_style: 'xưng ta, gọi người khác là ngươi' }] })
  const after = JSON.parse(fs.readFileSync(f, 'utf8')).characters.find((c) => c.id === 'son-tinh')
  if (after.reference_image !== 'characters/son-tinh.jpg') throw new Error('characters_save không đổi ngoại hình mà vẫn xoá character sheet')
  if (after.want !== 'cưới Mị Nương' || after.accessories?.[0]?.name !== 'gậy thần') throw new Error('mất trường khi cập nhật nhân vật')
  console.log('  ✓ characters_save giữ character sheet + lưu want/flaw/speech_style')
}
await call('series_bible_save', { project_id, logline: 'Hai thần tranh một người', central_question: 'Ai thắng?', episodes: [{ title: 'Kén rể', synopsis: 'Vua Hùng kén rể', hook: 'Núi mọc lên giữa đêm', beats: ['a', 'b'], cliffhanger: 'Thủy Tinh đến muộn' }] })
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

await call('episode_script_save', { project_id, episode_id: 'e01', recap: 'Sơn Tinh cưới được Mị Nương; Thủy Tinh thề trả thù' })
const sc = await call('story_context', { project_id, episode_id: 'e02' })
if (sc.project.logline !== 'Hai thần tranh một người' || sc.episodes[0].hook !== 'Núi mọc lên giữa đêm') throw new Error('story_context thiếu logline/hook')
if (!/trả thù/.test(sc.focus.previous.recap) || sc.focus.previous.last_scenes.length !== 3) throw new Error('story_context thiếu recap/cảnh cuối tập trước')
if (sc.characters.find((c) => c.id === 'son-tinh').flaw !== 'quá nhẫn nhịn') throw new Error('story_context thiếu hồ sơ nhân vật')
console.log('  ✓ story_context:', sc.focus.scene_budget, '| prev', sc.focus.previous.id)
const pv = await call('prompt_preview', { project_id, episode_id: 'e01', scene_id: 's02' })
console.log('preview image_prompt:', pv.image_prompt)
console.log('preview video_prompt:', pv.video_prompt, '| dur', pv.video_duration_sec)
// s03: Thủy Tinh nói ngoài khung hình → không được mô tả (vẽ) trong ảnh/video
const off = await call('prompt_preview', { project_id, episode_id: 'e01', scene_id: 's03' })
if (/giáp vảy cá/.test(off.image_prompt) || /giáp vảy cá/.test(off.video_prompt)) throw new Error('người nói ngoài khung bị đưa vào prompt ảnh/video')
console.log('  ✓ người nói ngoài khung không bị vẽ vào cảnh')
// characters: [] = chủ ý không ai trong khung (hồi tưởng có lời kể) → không suy từ người nói
await call('scene_update', { project_id, episode_id: 'e01', scene_id: 's03', changes: { characters: [] } })
const empty = await call('prompt_preview', { project_id, episode_id: 'e01', scene_id: 's03' })
if (/giáp vảy cá|áo choàng xanh lá/.test(empty.image_prompt)) throw new Error('characters: [] vẫn bị suy ra nhân vật từ người nói')
console.log('  ✓ characters: [] không vẽ ai vào khung')

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

// Look: trạng thái ngoại hình theo cảnh (trước/sau thay đồ) — mỗi look 1 sheet, cảnh chọn look qua scene.looks
{
  const base = { name: 'Mị Nương', appearance: 'thiếu nữ, áo yếm nâu, tóc thả dài', accessories: [{ name: 'quạt lụa', description: 'quạt lụa trắng' }] }
  const coDau = { id: 'co-dau', name: 'Cô dâu', appearance: 'thiếu nữ, áo cưới đỏ thêu phượng, khăn vấn vàng', accessories: [] }
  await call('characters_save', { project_id, characters: [{ ...base, looks: [coDau] }] })
  await call('episode_script_save', {
    project_id, episode_id: 'e02',
    scenes: [
      { characters: ['mi-nuong'], image_prompt: 'trung cảnh Mị Nương trước gương', duration_sec: 6 },
      { characters: ['Mị Nương'], looks: { 'Mị Nương': 'co-dau' }, image_prompt: 'trung cảnh Mị Nương bước ra', duration_sec: 6 }
    ]
  })
  const before = await call('prompt_preview', { project_id, episode_id: 'e02', scene_id: 's01' })
  const after = await call('prompt_preview', { project_id, episode_id: 'e02', scene_id: 's02' })
  if (!/áo yếm nâu/.test(before.image_prompt) || /áo cưới/.test(before.image_prompt)) throw new Error('cảnh không chọn look phải dùng dáng gốc')
  if (!/áo cưới đỏ/.test(after.image_prompt) || /áo yếm nâu|quạt lụa/.test(after.image_prompt + after.video_prompt)) throw new Error('cảnh look "co-dau" còn lẫn đồ/phụ kiện của dáng gốc')
  console.log('  ✓ scene.looks: cảnh "sau" không còn trang phục/phụ kiện "trước"')
  await expectError('scene_update', { project_id, episode_id: 'e02', scene_id: 's02', changes: { looks: { 'mi-nuong': 'khong-co' } } }, /look "khong-co"/)

  // Sheet riêng cho look: import → status thấy; gửi lại look không đổi giữ sheet, đổi trang phục thì bỏ sheet
  await call('asset_import', { project_id, kind: 'reference', target: 'mi-nuong:co-dau', file_path: img })
  const f = path.join(dir, project_id, 'project.json')
  const lookOf = () => JSON.parse(fs.readFileSync(f, 'utf8')).characters.find((c) => c.id === 'mi-nuong').looks[0]
  if (!lookOf().reference_image?.includes('mi-nuong--co-dau')) throw new Error('asset_import không gắn sheet cho look')
  const st = await call('project_get', { project_id })
  if (!st.characters.find((c) => c.id === 'mi-nuong').looks[0].sheet) throw new Error('project_get không báo sheet của look')
  await call('characters_save', { project_id, characters: [{ ...base, looks: [coDau] }] })
  if (!lookOf().reference_image) throw new Error('gửi lại look không đổi mà mất sheet')
  await call('characters_save', { project_id, characters: [{ ...base, looks: [{ ...coDau, appearance: 'thiếu nữ, áo cưới trắng' }] }] })
  if (lookOf().reference_image) throw new Error('đổi ngoại hình look mà vẫn giữ sheet cũ')
  const st2 = await call('project_get', { project_id })
  if (!st2.next_steps.some((s) => s.includes('mi-nuong:co-dau'))) throw new Error('next_steps phải nhắc sinh sheet cho look')
  console.log('  ✓ look có sheet riêng, giữ/bỏ sheet đúng khi characters_save')

  // Sinh sheet look phải gửi kèm sheet gốc làm ảnh tham chiếu (giữ mặt + màu da). Không có API key → lệnh gọi lỗi,
  // nhưng sổ quota vẫn ghi request.references nên kiểm được mà không tốn quota.
  await call('asset_import', { project_id, kind: 'reference', target: 'mi-nuong', file_path: img })
  const gen = await call('characters_generate', { project_id, ids: ['mi-nuong:co-dau'], force: true, wait_sec: 30 })
  const usage = fs.readFileSync(path.join(dir, project_id, 'usage.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
  const lookCall = usage.findLast((u) => u.target === 'mi-nuong:co-dau')
  if (!lookCall || lookCall.request?.references !== 1) throw new Error(`sheet look phải gửi 1 ảnh tham chiếu (sheet gốc), nhận: ${JSON.stringify(lookCall?.request)}`)
  if (usage.some((u) => u.target === 'mi-nuong' && u.ts > lookCall.ts)) throw new Error('chỉ sinh look thì không được sinh lại sheet gốc')
  console.log('  ✓ sheet look gửi kèm sheet gốc làm tham chiếu', gen.status)
}
await client.close()
