// Publisher với trang upload GIẢ (file://, cùng selector với adapter) + Chrome headless: điền đúng, dừng trước nút Đăng,
// xử lý chưa đăng nhập, và đi hết luồng tool qua MCP client thật. Không chạm site thật, không cần tài khoản.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'film-publisher-'))
const env = {
  FILM_PROJECTS_DIR: path.join(tmp, 'projects'),
  PUBLISH_PROFILE_DIR: path.join(tmp, 'profile'),
  PUBLISH_HEADLESS: '1',
  PUBLISH_UPLOAD_TIMEOUT_MS: '10000'
}
Object.assign(process.env, env)
const norm = (t) => t.replace(/\s+/g, ' ').trim()
const assert = (ok, msg) => {
  if (!ok) throw new Error(msg)
  console.log(`  ✓ ${msg}`)
}

// ── Trang giả ──
const radio = (name) => `<tp-yt-paper-radio-button name="${name}" onclick="pick(this)">${name}</tp-yt-paper-radio-button>`
const pages = {
  youtube: `<!doctype html><meta charset="utf-8"><body>
<input type="file" id="up" onchange="document.getElementById('form').hidden=false">
<div id="form" hidden>
  <div id="title-textarea"><div id="textbox" contenteditable="true"></div></div>
  <div id="description-textarea"><div id="textbox" contenteditable="true"></div></div>
  <input type="file" id="file-loader">
  ${radio('VIDEO_MADE_FOR_KIDS_MFK')}${radio('VIDEO_MADE_FOR_KIDS_NOT_MFK')}
  <button id="toggle-button" onclick="document.getElementById('more').hidden=false">Hiện thêm</button>
  <div id="more" hidden><div id="tags-container"><input aria-label="Tags"></div>${radio('VIDEO_HAS_ALTERED_CONTENT_YES')}${radio('VIDEO_HAS_ALTERED_CONTENT_NO')}</div>
  <button id="next-button" onclick="state.next++">Tiếp</button>
  ${radio('PRIVATE')}${radio('UNLISTED')}${radio('PUBLIC')}
  <span class="video-url-fadeable"><a href="https://youtu.be/MOCK123">https://youtu.be/MOCK123</a></span>
  <button id="done-button" onclick="state.published=true">Lưu</button>
</div>
<script>window.state={next:0,picked:[],published:false};function pick(el){state.picked.push(el.getAttribute('name'))}</script>`,
  tiktok: `<!doctype html><meta charset="utf-8"><body>
<input type="file" accept="video/*" onchange="document.getElementById('f').hidden=false">
<div id="f" hidden><div class="public-DraftEditor-content" contenteditable="true">tên file mặc định</div>
<button onclick="state.published=true">Đăng</button></div><script>window.state={published:false}</script>`,
  reels: `<!doctype html><meta charset="utf-8"><body>
<input type="file" accept="video/*" onchange="document.getElementById('n').hidden=false">
<div id="n" hidden><div role="button" onclick="document.getElementById('f').hidden=false">Tiếp</div></div>
<div id="f" hidden><div contenteditable="true" role="textbox"></div><div role="button" onclick="state.published=true">Đăng</div></div>
<script>window.state={published:false}</script>`,
  login: `<!doctype html><meta charset="utf-8"><body><input name="email"> đăng nhập`
}
const pageDir = path.join(tmp, 'pages')
fs.mkdirSync(pageDir)
for (const [k, html] of Object.entries(pages)) fs.writeFileSync(path.join(pageDir, `${k}.html`), html)
const fileUrl = (k) => `file://${path.join(pageDir, `${k}.html`)}`
process.env.PUBLISH_URL_YOUTUBE = env.PUBLISH_URL_YOUTUBE = fileUrl('youtube')
process.env.PUBLISH_URL_REELS = env.PUBLISH_URL_REELS = fileUrl('reels')
process.env.PUBLISH_URL_TIKTOK = env.PUBLISH_URL_TIKTOK = fileUrl('tiktok')

// ── Bộ đăng bài thật từ final.mp4 giả ──
const { createProject, updateProject, projectDir } = await import('../src/project.js')
const { buildPublishKit, readManifest } = await import('../src/publish.js')
const ff = (...a) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...a])
const p = createProject({ title: 'Mèo Con Tìm Mẹ', style: 'hoạt hình màu nước' })
const out = path.join(projectDir(p.id), 'episodes/e01/output')
fs.mkdirSync(out, { recursive: true })
ff('-f', 'lavfi', '-i', 'testsrc2=size=1280x720:rate=30:duration=36', '-f', 'lavfi', '-i', 'sine=d=36', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-preset', 'ultrafast', '-shortest', path.join(out, 'final.mp4'))
ff('-ss', '2', '-i', path.join(out, 'final.mp4'), '-frames:v', '1', '-pix_fmt', 'yuvj420p', path.join(out, 'cover.jpg'))
await updateProject(p.id, (pr) => {
  pr.episodes = [{ id: 'e01', number: 1, title: 'Lạc mẹ', hook: 'Một tiếng sấm, và mèo con chỉ còn một mình', synopsis: 'Mèo con lạc mẹ trong cơn mưa.',
    scenes: ['s01', 's02', 's03'].map((id) => ({ id, title: id, image_prompt: 'x', assets: {} })),
    output: { video: 'episodes/e01/output/final.mp4', cover: 'episodes/e01/output/cover.jpg', srt: null, duration_sec: 36, scene_starts: [{ id: 's01', start: 0 }, { id: 's02', start: 12 }, { id: 's03', start: 24 }], stills_used: [] } }]
})
await buildPublishKit(p.id, 'e01', { platforms: ['youtube', 'tiktok', 'reels'] })

// ── 1) Adapter trực tiếp: soi trạng thái trang giả ──
const { ADAPTERS } = await import('../src/publisher/platforms.js')
const { newPage, closeBrowser } = await import('../src/publisher/browser.js')
const kit = readManifest(p.id, 'e01')
const fileOf = (r) => (r ? path.join(projectDir(p.id), r) : null)

{
  const page = await newPage()
  let refused = false
  try {
    await ADAPTERS.youtube.prepare(page, { ...kit.platforms.youtube, made_for_kids: null }, { video: fileOf(kit.platforms.youtube.file) })
  } catch (e) {
    refused = /trẻ em/.test(e.message)
  }
  assert(refused, 'YouTube: chưa chốt made_for_kids → từ chối điền')

  const d = { ...kit.platforms.youtube, made_for_kids: false }
  const r = await ADAPTERS.youtube.prepare(page, d, { video: fileOf(d.file), thumbnail: fileOf(d.thumbnail) })
  const s = await page.evaluate(() => ({
    ...window.state,
    title: document.querySelector('#title-textarea #textbox').innerText,
    desc: document.querySelector('#description-textarea #textbox').innerText,
    tags: document.querySelector('input[aria-label="Tags"]').value,
    thumb: document.querySelector('#file-loader').files.length
  }))
  assert(s.title === d.title, `tiêu đề: ${s.title}`)
  if (norm(s.desc) !== norm(d.description)) console.log(JSON.stringify({ got: s.desc, want: d.description }))
  assert(norm(s.desc) === norm(d.description) && s.desc.includes('\n'), 'mô tả đầy đủ, giữ xuống dòng (gồm mục lục + hashtag)')
  assert(s.tags.startsWith('Mèo Con Tìm Mẹ'), `tags: ${s.tags}`)
  assert(s.thumb === 1, 'đã chọn ảnh bìa')
  assert(s.picked.join() === 'VIDEO_MADE_FOR_KIDS_NOT_MFK,VIDEO_HAS_ALTERED_CONTENT_NO,PRIVATE', `chọn: ${s.picked.join(', ')}`)
  assert(s.next === 3, 'qua 3 bước Tiếp')
  assert(s.published === false, 'KHÔNG bấm Lưu/Đăng')
  assert(r.video_url === 'https://youtu.be/MOCK123' && r.manual.at(-1).includes('Lưu'), 'đọc được link video + nhắc người dùng tự bấm Lưu')
  await page.close()
}
{
  const page = await newPage()
  const d = kit.platforms.tiktok
  const r = await ADAPTERS.tiktok.prepare(page, d, { video: fileOf(d.file), cover: fileOf(d.cover) })
  const s = await page.evaluate(() => ({ ...window.state, caption: document.querySelector('.public-DraftEditor-content').innerText }))
  assert(norm(s.caption) === norm(d.caption), 'TikTok: caption thay hẳn tên file mặc định')
  assert(!s.published && r.manual.some((m) => /Chỉ mình tôi/.test(m)) && r.manual.some((m) => /AI/.test(m)), 'TikTok: không bấm Đăng; nhắc chọn "Chỉ mình tôi" + nhãn AI')
  await page.close()
}
{
  const page = await newPage()
  const d = kit.platforms.reels
  await ADAPTERS.reels.prepare(page, d, { video: fileOf(d.file) })
  const s = await page.evaluate(() => ({ ...window.state, caption: document.querySelector('[role=textbox]').innerText }))
  assert(norm(s.caption) === norm(d.caption) && !s.published, 'Reels: qua bước Tiếp, điền mô tả, không bấm Đăng')
  await page.close()
}
await closeBrowser()

// ── 2) Qua MCP: status → prepare → screenshot → record; chưa đăng nhập ──
const client = new Client({ name: 'smoke', version: '1' })
await client.connect(new StdioClientTransport({ command: 'node', args: ['src/publisher/server.js'], env: { ...process.env, ...env, PUBLISH_URL_TIKTOK: fileUrl('login') }, stderr: 'ignore' }))
const raw = (name, args = {}) => client.callTool({ name, arguments: args })
const call = async (name, args) => {
  const r = await raw(name, args)
  if (r.isError) throw new Error(`${name}: ${r.content[0].text}`)
  return { data: JSON.parse(r.content[0].text), content: r.content }
}
console.log('tools:', (await client.listTools()).tools.map((t) => t.name).join(', '))

const st = await call('publisher_status', { project_id: p.id, episode_id: 'e01' })
assert(st.data.kit.join() === 'youtube,tiktok,reels' && st.data.browser_open === false, 'publisher_status đọc bộ đăng bài')

const noKids = await raw('publish_prepare', { project_id: p.id, episode_id: 'e01', platform: 'youtube' })
assert(/trẻ em/.test(noKids.content[0].text), 'MCP: YouTube chặn khi chưa chốt made_for_kids')
await updateProject(p.id, (pr) => (pr.episodes[0].publish = { made_for_kids: false }))
await buildPublishKit(p.id, 'e01', { platforms: ['youtube', 'tiktok', 'reels'] })

const prep = await call('publish_prepare', { project_id: p.id, episode_id: 'e01', platform: 'youtube' })
assert(prep.data.status === 'succeeded' && prep.content[1]?.type === 'image', 'publish_prepare xong + kèm screenshot')
assert(readManifest(p.id, 'e01').uploads.youtube.status === 'prepared', 'publish.json: uploads.youtube = prepared')

const shot = await raw('publish_screenshot', { platform: 'youtube' })
assert(shot.content[1]?.type === 'image', 'publish_screenshot trả ảnh')

const tk = await raw('publish_prepare', { project_id: p.id, episode_id: 'e01', platform: 'tiktok' })
assert(/Chưa đăng nhập.*publisher_login/.test(tk.content[0].text), `chưa đăng nhập → chỉ publisher_login: ${tk.content[0].text.slice(0, 120)}`)

const rec = await call('publish_record', { project_id: p.id, episode_id: 'e01', platform: 'youtube', visibility: 'private' })
assert(rec.data.status === 'posted' && rec.data.url === 'https://youtu.be/MOCK123', 'publish_record dùng link đọc được lúc prepare')

// Bộ đăng bài chạy lại vẫn giữ uploads
await buildPublishKit(p.id, 'e01', { platforms: ['youtube'] })
assert(readManifest(p.id, 'e01').uploads.youtube.visibility === 'private', 'chạy lại kit giữ uploads')

await raw('publisher_close')
await client.close()
console.log(`OK — ${tmp}`)
