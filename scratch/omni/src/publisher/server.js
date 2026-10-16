#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import '../config.js'
import * as jobs from '../jobs.js'
import { abs } from '../project.js'
import { readManifest, writeManifest } from '../publish.js'
import { NotLoggedIn, browserConfig, closeBrowser, isOpen, newPage, openLogin, profileLocked } from './browser.js'
import { ADAPTERS, LOGIN_URLS } from './platforms.js'

/**
 * MCP "publisher": đăng tập phim lên YouTube / TikTok / Facebook bằng CHROME THẬT của người dùng.
 * Đọc bộ đăng bài (episode_publish_kit → publish/publish.json), mở trang upload, chọn file + điền sẵn mọi trường,
 * đặt chế độ riêng tư, rồi DỪNG — người dùng tự xem và tự bấm Đăng/Lưu. Server không bao giờ bấm nút đăng.
 */

const server = new McpServer(
  { name: 'publisher', version: '0.1.0' },
  {
    instructions:
      'Publisher — đăng phim của film-studio bằng Chrome thật của người dùng (profile riêng, đã đăng nhập sẵn). ' +
      'Quy trình: film-studio episode_publish_kit → publisher_status → (lần đầu) publisher_login → publish_prepare (điền sẵn, dừng trước nút Đăng) → ' +
      'người dùng TỰ bấm Đăng/Lưu → publish_record. Server không bấm nút đăng, không giải captcha, không nhập mật khẩu. ' +
      'Gặp captcha/2FA/xác minh: dừng, để người dùng tự làm trong cửa sổ Chrome.'
  }
)

const json = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] })
const fail = (err) => ({ isError: true, content: [{ type: 'text', text: `Lỗi: ${err.message || err}` }] })
const safe = (fn) => async (args) => {
  try {
    return await fn(args)
  } catch (err) {
    return fail(err)
  }
}

const projectId = z.string().describe('ID dự án film-studio')
const episodeId = z.string().describe('ID tập, ví dụ "e01"')
const platform = z.enum(Object.keys(ADAPTERS)).describe('youtube | shorts | tiktok | reels')
const waitSec = z.number().min(0).max(55).optional().describe('Chờ tối đa N giây (mặc định 50)')

/** Lần screenshot gần nhất của từng nền tảng — publish_screenshot trả lại. */
const pages = new Map()

function loadKit(project_id, episode_id, p) {
  const m = readManifest(project_id, episode_id)
  if (!m) throw new Error(`Tập ${episode_id} chưa có bộ đăng bài — gọi film-studio episode_publish_kit trước.`)
  const d = m.platforms?.[p]
  if (!d) throw new Error(`Bộ đăng bài chưa có nền tảng "${p}" — gọi episode_publish_kit(platforms=[..., "${p}"]).`)
  const file = (r) => (r ? abs(project_id, r) : null)
  const files = { video: file(d.file), thumbnail: file(d.thumbnail), captions: file(d.captions?.file), cover: file(d.cover) }
  if (!files.video || !fs.existsSync(files.video)) throw new Error(`Không thấy file video ${files.video} — chạy lại episode_publish_kit.`)
  return { m, d, files }
}

async function recordUpload(project_id, episode_id, p, patch) {
  const m = readManifest(project_id, episode_id)
  m.uploads = { ...m.uploads, [p]: { ...m.uploads?.[p], ...patch } }
  writeManifest(project_id, episode_id, m)
  return m.uploads[p]
}

server.registerTool(
  'publisher_status',
  {
    title: 'Trạng thái publisher',
    description: 'Profile Chrome dùng để đăng, browser đang mở chưa, và (episode_id) các nền tảng của tập đã chuẩn bị/đăng tới đâu.',
    inputSchema: { project_id: projectId.optional(), episode_id: episodeId.optional() },
    annotations: { readOnlyHint: true }
  },
  safe(async ({ project_id, episode_id }) => {
    const m = project_id && episode_id ? readManifest(project_id, episode_id) : null
    return json({
      profile_dir: browserConfig.profileDir,
      profile_exists: fs.existsSync(browserConfig.profileDir),
      chrome: process.env.PUBLISH_CHROME_PATH || 'Chrome cài trên máy (channel "chrome")',
      browser_open: isOpen(),
      login_window_open: profileLocked(),
      platforms: Object.fromEntries(Object.values(ADAPTERS).map((a) => [a.id, a.label])),
      ...(m ? { kit: Object.keys(m.platforms || {}), uploads: m.uploads || {}, kit_warnings: m.warnings } : {}),
      hint: fs.existsSync(browserConfig.profileDir)
        ? 'Đăng nhập được kiểm tra khi publish_prepare mở trang upload; chưa đăng nhập → publisher_login.'
        : 'Chưa có profile → publisher_login để người dùng đăng nhập lần đầu.'
    })
  })
)

server.registerTool(
  'publisher_login',
  {
    title: 'Mở Chrome để người dùng đăng nhập',
    description:
      'Mở 1 cửa sổ Chrome THƯỜNG (không automation) với profile publisher, tại trang đăng nhập các nền tảng. NGƯỜI DÙNG tự đăng nhập (kể cả 2FA/captcha); ' +
      'xong thì THOÁT hẳn Chrome đó (Cmd+Q). Cookie ở lại profile cho các lần sau. Không bao giờ hỏi/nhận mật khẩu trong chat.',
    inputSchema: { platforms: z.array(z.enum(Object.keys(LOGIN_URLS))).optional().describe('Mặc định cả youtube, tiktok, facebook') }
  },
  safe(async ({ platforms = Object.keys(LOGIN_URLS) }) => {
    const { pid } = await openLogin(platforms.map((p) => LOGIN_URLS[p]))
    return json({
      opened: platforms,
      pid,
      next: 'Người dùng đăng nhập từng tab trong cửa sổ Chrome vừa mở, rồi THOÁT hẳn Chrome đó (Cmd+Q). Sau đó gọi publish_prepare.'
    })
  })
)

server.registerTool(
  'publish_prepare',
  {
    title: 'Điền sẵn bài đăng (dừng trước nút Đăng)',
    description:
      'Mở trang upload của nền tảng trong Chrome của người dùng, chọn file từ bộ đăng bài, điền tiêu đề/mô tả/caption/hashtag/thẻ/ảnh bìa, chọn "dành cho trẻ em" và chế độ RIÊNG TƯ, ' +
      'rồi DỪNG ở màn hình cuối. Trả danh sách đã điền + việc người dùng cần tự làm (luôn gồm bấm Đăng/Lưu) + screenshot. Chạy nền → theo dõi bằng publish_job_status.',
    inputSchema: { project_id: projectId, episode_id: episodeId, platform, wait_sec: waitSec }
  },
  safe(async ({ project_id, episode_id, platform: p, wait_sec }) => {
    const { d, files } = loadKit(project_id, episode_id, p)
    const adapter = ADAPTERS[p]
    const job = jobs.startJob(`prepare:${p}`, project_id, async (log) => {
      const page = await newPage()
      try {
        const r = await adapter.prepare(page, d, files, log)
        const shot = await page.screenshot({ type: 'jpeg', quality: 70 }).catch(() => null)
        pages.set(p, page)
        await recordUpload(project_id, episode_id, p, { status: 'prepared', prepared_at: new Date().toISOString(), video_url: r.video_url || undefined, visibility_set: d.visibility, manual_steps: r.manual })
        return { platform: adapter.label, filled: r.filled, manual_steps: r.manual, video_url: r.video_url, screenshot: shot ? shot.toString('base64') : null, next: 'Người dùng tự kiểm tra và bấm Đăng/Lưu trong cửa sổ Chrome → publish_record.' }
      } catch (err) {
        const shot = await page.screenshot({ type: 'jpeg', quality: 70 }).catch(() => null)
        pages.set(p, page)
        if (err instanceof NotLoggedIn) throw new Error(`Chưa đăng nhập ${adapter.label} trong profile publisher → publisher_login(platforms=["${p === 'shorts' ? 'youtube' : p === 'reels' ? 'facebook' : p}"]).`)
        throw new Error(`${err.message}${shot ? ' (xem publish_screenshot)' : ''}`)
      }
    })
    return jobView(await jobs.waitJob(job.id, wait_sec ?? 50))
  })
)

/** Ảnh screenshot trả thành content image thay vì base64 trong JSON. */
function jobView(view) {
  if (view.status === 'failed') return fail(`${view.error}\n\nlog:\n${view.recent_log.join('\n')}`)
  const shot = view.result?.screenshot
  if (!shot) return json(view)
  const { screenshot, ...result } = view.result
  return { content: [{ type: 'text', text: JSON.stringify({ ...view, result }, null, 2) }, { type: 'image', data: shot, mimeType: 'image/jpeg' }] }
}

server.registerTool(
  'publish_job_status',
  {
    title: 'Theo dõi publish_prepare',
    description: 'Trạng thái job chuẩn bị bài đăng (upload file lớn có thể mất vài phút). wait_sec để chờ.',
    inputSchema: { job_id: z.string(), wait_sec: waitSec },
    annotations: { readOnlyHint: true }
  },
  safe(async ({ job_id, wait_sec }) => jobView(wait_sec ? await jobs.waitJob(job_id, wait_sec) : jobs.view(jobs.getJob(job_id), 30)))
)

server.registerTool(
  'publish_screenshot',
  {
    title: 'Chụp màn hình trang đăng',
    description: 'Ảnh hiện tại của tab đăng bài (sau publish_prepare) — để cùng người dùng kiểm tra trước khi họ bấm Đăng, hoặc xem vì sao 1 bước không điền được.',
    inputSchema: { platform },
    annotations: { readOnlyHint: true }
  },
  safe(async ({ platform: p }) => {
    const page = pages.get(p)
    if (!page || page.isClosed()) throw new Error(`Chưa có tab ${p} nào đang mở — publish_prepare trước.`)
    const shot = await page.screenshot({ type: 'jpeg', quality: 70 })
    return { content: [{ type: 'text', text: page.url() }, { type: 'image', data: shot.toString('base64'), mimeType: 'image/jpeg' }] }
  })
)

server.registerTool(
  'publish_record',
  {
    title: 'Ghi nhận đã đăng',
    description: 'SAU KHI người dùng tự bấm Đăng/Lưu: ghi link + chế độ hiển thị thực tế vào publish.json (bộ đăng bài tập sau dùng để chèn link tập trước). Chỉ ghi những gì người dùng xác nhận.',
    inputSchema: {
      project_id: projectId,
      episode_id: episodeId,
      platform,
      url: z.string().url().optional().describe('Link bài đăng (người dùng đưa, hoặc video_url publish_prepare đọc được)'),
      visibility: z.enum(['private', 'unlisted', 'public', 'draft', 'scheduled']).describe('Chế độ thực tế người dùng đã chọn khi bấm')
    }
  },
  safe(async ({ project_id, episode_id, platform: p, url, visibility }) => {
    loadKit(project_id, episode_id, p)
    const prev = readManifest(project_id, episode_id).uploads?.[p]
    const rec = await recordUpload(project_id, episode_id, p, { status: 'posted', url: url || prev?.video_url, visibility, posted_at: new Date().toISOString() })
    return json({ recorded: p, ...rec })
  })
)

server.registerTool(
  'publisher_close',
  { title: 'Đóng Chrome của publisher', description: 'Đóng cửa sổ Chrome do publisher mở (sau khi người dùng đăng xong).', inputSchema: {} },
  safe(async () => {
    await closeBrowser()
    pages.clear()
    return json({ closed: true })
  })
)

await server.connect(new StdioServerTransport())
process.on('SIGTERM', () => closeBrowser().finally(() => process.exit(0)))
console.error(`[publisher] MCP server sẵn sàng — profile: ${path.relative(process.cwd(), browserConfig.profileDir) || browserConfig.profileDir}`)
