#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { config } from './config.js'
import { BRAINSTORM_PROMPT, EPISODE_PROMPT, GUIDE, VOICES } from './guide.js'
import * as jobs from './jobs.js'
import { TRANSITIONS, layoutLines, probe } from './media.js'
import * as pipeline from './pipeline.js'
import { USAGE_GROUPS, usageReport } from './usage.js'
import { startDashboard } from './dashboard/http.js'
import {
  abs, createProject, ensureDir, findCharacter, findEpisode, findLocation, findScene, listProjects, loadProject, projectDir,
  rel, sceneDir, slugify, summarize, summarizeEpisode, updateProject, EPISODE_DEFAULT_SEC, EPISODE_MAX_SEC, EPISODE_MIN_SEC
} from './project.js'

const server = new McpServer(
  { name: 'film-studio', version: '0.2.0' },
  {
    instructions:
      'Film Studio — làm phim truyện nhiều tập từ kịch bản tới mp4 đăng được ngay. Gọi `studio_guide` TRƯỚC khi bắt đầu. ' +
      'Quy trình: brainstorm với người dùng → project_create → series_bible_save → characters_save → characters_generate (character sheet + phụ kiện) → ' +
      'mỗi tập: episode_script_save → episode_audio_generate → storyboard_generate → storyboard_review/approve → episode_videos_generate → music_generate → episode_assemble. ' +
      'Bước sinh chạy nền, trả job_id → theo dõi bằng job_status(wait_sec). project_get / episode_get luôn chỉ ra bước tiếp theo.'
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

const projectId = z.string().describe('ID dự án (từ project_create / project_list)')
const episodeId = z.string().describe('ID tập, ví dụ "e01"')
const sceneIds = z.array(z.string()).optional().describe('Chỉ xử lý các cảnh này; bỏ trống = mọi cảnh còn thiếu của tập')
const force = z.boolean().optional().describe('Sinh lại cả asset đã có')
// coerce: client chưa nạp schema mới (hoặc agent) hay gửi số dạng chuỗi "5".
const episodeMinutes = z.coerce
  .number()
  .min(EPISODE_MIN_SEC / 60)
  .max(EPISODE_MAX_SEC / 60)
const episodeDurationMin = episodeMinutes.describe(
  `Độ dài chuẩn của MỖI tập (phút), ${EPISODE_MIN_SEC / 60}–${EPISODE_MAX_SEC / 60}. Mặc định ${EPISODE_DEFAULT_SEC / 60} phút — các tập nên dài như nhau`
)
const waitSec = z.number().min(0).max(55).optional().describe('Chờ tối đa N giây cho job xong trước khi trả về (mặc định 0 = trả job_id ngay)')

async function launch(kind, id, wait, fn) {
  loadProject(id) // báo lỗi sớm nếu sai project_id
  const job = jobs.startJob(kind, id, fn)
  if (wait) return json(await jobs.waitJob(job.id, wait))
  return json({ job_id: job.id, status: 'running', hint: `Gọi job_status(job_id="${job.id}", wait_sec=50) để theo dõi.` })
}

const audioMode = (p) => summarize(p, pipeline)
const episodeStatus = (p, ep) => summarizeEpisode(p, ep, pipeline)

// ═══════════════ Hướng dẫn ═══════════════

server.registerTool(
  'studio_guide',
  {
    title: 'Hướng dẫn Film Studio',
    description: 'Đọc ĐẦU TIÊN. Quy trình làm phim nhiều tập, cấu trúc kịch bản, cách viết prompt, giọng đọc, chuyển cảnh, chế độ âm thanh.',
    inputSchema: {},
    annotations: { readOnlyHint: true }
  },
  async () => ({ content: [{ type: 'text', text: GUIDE }] })
)

server.registerResource('guide', 'film://guide', { title: 'Film Studio guide', mimeType: 'text/markdown' }, async (uri) => ({
  contents: [{ uri: uri.href, mimeType: 'text/markdown', text: GUIDE }]
}))

server.registerPrompt(
  'brainstorm_series',
  {
    title: 'Brainstorm dự án phim',
    description: 'Dẫn dắt brainstorm với người dùng: chủ đề, thế giới, nhân vật (tính cách + phụ kiện), mạch truyện, chia tập — rồi lưu vào Film Studio.',
    argsSchema: {
      idea: z.string().describe('Ý tưởng ban đầu'),
      episodes: z.string().optional().describe('Số tập dự kiến'),
      platform: z.string().optional().describe('Nơi đăng: youtube, tiktok, reels, facebook...')
    }
  },
  (args) => ({ messages: [{ role: 'user', content: { type: 'text', text: BRAINSTORM_PROMPT(args) } }] })
)

server.registerPrompt(
  'write_episode',
  {
    title: 'Viết kịch bản 1 tập',
    description: 'Viết kịch bản chi tiết + phân cảnh cho 1 tập dựa trên series bible đã lưu.',
    argsSchema: { project_id: z.string(), episode_id: z.string() }
  },
  ({ project_id, episode_id }) => ({ messages: [{ role: 'user', content: { type: 'text', text: EPISODE_PROMPT({ project_id, episode_id }) } }] })
)

// ═══════════════ Dự án ═══════════════

server.registerTool(
  'project_create',
  {
    title: 'Tạo dự án phim',
    description: 'Tạo dự án phim (1 hoặc nhiều tập). Gọi SAU khi đã brainstorm sơ bộ với người dùng. Trả project_id.',
    inputSchema: {
      title: z.string().describe('Tên phim / series'),
      logline: z.string().optional().describe('Tóm tắt 1-2 câu'),
      aspect_ratio: z.enum(['16:9', '9:16']).optional().describe('16:9 cho YouTube/Facebook, 9:16 cho TikTok/Reels/Shorts. Mặc định 16:9'),
      resolution: z.enum(['720p', '1080p']).optional().describe('Mặc định 720p'),
      language: z.string().optional().describe('Ngôn ngữ thoại (ISO 639-1). Mặc định "vi"'),
      style: z.string().optional().describe('Phong cách hình ảnh áp cho MỌI ảnh/video của dự án, ví dụ "hoạt hình 3D kiểu Pixar, ánh sáng ấm"'),
      audio_mode: z
        .enum(['auto', 'tts', 'native'])
        .optional()
        .describe('auto (mặc định): cảnh mà người nói đều trong khung hình dùng tiếng của video (khớp khẩu hình), cảnh có lời dẫn/người nói ngoài khung dùng TTS. tts/native: ép cho mọi cảnh'),
      episode_duration_min: episodeDurationMin.optional()
    }
  },
  safe(async ({ episode_duration_min, ...args }) => {
    const project = createProject({ ...args, episode_duration_sec: episode_duration_min ? Math.round(episode_duration_min * 60) : undefined })
    return json({ project_id: project.id, dir: projectDir(project.id), next: 'series_bible_save → characters_save' })
  })
)

server.registerTool(
  'project_list',
  { title: 'Danh sách dự án', description: 'Các dự án phim hiện có (mới nhất trước).', inputSchema: {}, annotations: { readOnlyHint: true } },
  safe(async () =>
    json(listProjects().map((p) => ({ project_id: p.id, title: p.title, episodes: p.episodes.length, characters: p.characters.length, updated_at: p.updated_at })))
  )
)

server.registerTool(
  'project_get',
  {
    title: 'Tổng quan dự án',
    description: 'Tiến độ toàn dự án: bible, nhân vật (đã có character sheet chưa), bối cảnh, từng tập (storyboard/video/phim cuối) và next_steps. full=true kèm toàn bộ manifest.',
    inputSchema: { project_id: projectId, full: z.boolean().optional() },
    annotations: { readOnlyHint: true }
  },
  safe(async ({ project_id, full }) => {
    const p = loadProject(project_id)
    const { total } = usageReport(project_id)
    const usage = { calls: total.calls, failed: total.failed, regenerated: total.regenerated, images: total.images, video_sec: total.video_sec, audio_sec: total.audio_sec, total_tokens: total.total_tokens, est_cost: total.est_cost, detail: 'usage_report' }
    return json(full ? { summary: { ...audioMode(p), usage }, manifest: p } : { ...audioMode(p), usage })
  })
)

// ═══════════════ Series bible + nhân vật ═══════════════

const musicSchema = z.object({
  prompt: z.string().describe('Thể loại, nhạc cụ, cảm xúc, tempo. Ví dụ "nhạc dân tộc, sáo trúc, trống đồng, hùng tráng, 90 BPM"'),
  volume: z.number().min(0).max(1).optional().describe('Âm lượng nhạc nền dưới thoại, mặc định 0.25')
})

server.registerTool(
  'series_bible_save',
  {
    title: 'Lưu series bible',
    description:
      'Lưu kết quả brainstorm cho TOÀN dự án: tiền đề, chủ đề, thế giới, tông, mạch truyện tổng quát, và dàn ý các tập (tạo sẵn tập e01, e02...). Gọi lại để cập nhật — chỉ ghi đè trường được truyền.',
    inputSchema: {
      project_id: projectId,
      premise: z.string().optional().describe('Tiền đề / câu chuyện tổng quát'),
      themes: z.string().optional().describe('Chủ đề, thông điệp'),
      world: z.string().optional().describe('Thế giới, thời đại, quy tắc'),
      tone: z.string().optional().describe('Tông phim: hài, kịch tính, cảm động...'),
      audience: z.string().optional().describe('Khán giả mục tiêu'),
      story_arc: z.string().optional().describe('Kịch bản tổng quát cả series: mở đầu, phát triển, cao trào, kết'),
      notes: z.string().optional(),
      style: z.string().optional().describe('Cập nhật phong cách hình ảnh của dự án'),
      music: musicSchema.optional().describe('Nhạc chủ đề cả series (từng tập có thể ghi đè)'),
      narrator_voice: z.string().optional().describe('Giọng người dẫn chuyện, mặc định Charon'),
      episode_duration_min: episodeDurationMin.optional().describe('Đổi độ dài chuẩn mỗi tập (phút, 3–8) — chỉ áp cho tập chưa chốt độ dài'),
      episodes: z
        .array(z.object({ title: z.string(), synopsis: z.string().describe('Tóm tắt nội dung tập') }))
        .optional()
        .describe('Dàn ý các tập theo thứ tự. Tập đã có (cùng vị trí) chỉ được cập nhật title/synopsis, không mất kịch bản/asset')
    }
  },
  safe(async ({ project_id, episodes, style, music, narrator_voice, episode_duration_min, ...bible }) => {
    const p = await updateProject(project_id, (p) => {
      p.bible = { ...p.bible, ...Object.fromEntries(Object.entries(bible).filter(([, v]) => v !== undefined)) }
      if (style) p.style = style
      if (music) p.music = music
      if (narrator_voice) p.narrator_voice = narrator_voice
      if (episode_duration_min) p.episode_duration_sec = Math.round(episode_duration_min * 60)
      episodes?.forEach((e, i) => {
        const id = `e${String(i + 1).padStart(2, '0')}`
        const existing = p.episodes.find((x) => x.id === id)
        if (existing) Object.assign(existing, { title: e.title, synopsis: e.synopsis })
        else p.episodes.push({ id, number: i + 1, title: e.title, synopsis: e.synopsis, script: '', scenes: [], music: null, output: null })
      })
    })
    return json({ saved: true, status: audioMode(p) })
  })
)

const accessorySchema = z.object({ name: z.string(), description: z.string().optional().describe('Hình dáng, màu, chất liệu, cách mang/cầm') })

const characterSchema = z.object({
  id: z.string().optional().describe('ID ngắn không dấu; bỏ trống = tự tạo từ name'),
  name: z.string(),
  role: z.string().optional().describe('Vai trò: nhân vật chính, phản diện, bạn đồng hành...'),
  appearance: z.string().describe('Ngoại hình CỐ ĐỊNH, càng cụ thể càng tốt: tuổi, giới, dáng, tóc, mắt, trang phục, màu sắc — dùng lại ở mọi cảnh'),
  personality: z.string().optional().describe('Tính cách — điều khiển biểu cảm, dáng điệu, cách nói'),
  accessories: z.array(accessorySchema).optional().describe('Phụ kiện/đạo cụ gắn liền nhân vật (vũ khí, mũ, thú cưng...) — xuất hiện trong character sheet và mọi cảnh'),
  voice: z.string().optional().describe(`Giọng TTS: ${VOICES.map((v) => v.name).join(', ')}`)
})

const locationSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().describe('Mô tả bối cảnh lặp lại: kiến trúc, màu sắc, ánh sáng, đồ vật đặc trưng')
})

server.registerTool(
  'characters_save',
  {
    title: 'Lưu nhân vật + bối cảnh',
    description:
      'Lưu/cập nhật nhân vật (ngoại hình, tính cách, phụ kiện, giọng) và bối cảnh lặp lại. Cập nhật theo id — nhân vật không đổi ngoại hình/phụ kiện giữ nguyên character sheet đã sinh.',
    inputSchema: {
      project_id: projectId,
      characters: z.array(characterSchema).optional(),
      locations: z.array(locationSchema).optional(),
      remove: z.array(z.string()).optional().describe('ID nhân vật/bối cảnh cần xoá')
    }
  },
  safe(async ({ project_id, characters = [], locations = [], remove = [] }) => {
    const p = await updateProject(project_id, (p) => {
      p.locations ||= []
      const upsert = (list, item, visualKey) => {
        const at = list.findIndex((x) => x.id === item.id)
        const prev = at >= 0 ? list[at] : null
        const keepRef = prev && visualKey(prev) === visualKey(item) ? prev.reference_image : null
        const value = { ...prev, ...item, reference_image: keepRef }
        if (at >= 0) list[at] = value
        else list.push(value)
      }
      characters.forEach((c, i) => {
        const id = slugify(c.id || c.name)
        const prev = p.characters.find((x) => x.id === id)
        const voice = c.voice || prev?.voice || VOICES[(p.characters.length + i) % VOICES.length].name
        upsert(p.characters, { ...c, id, voice }, (x) => JSON.stringify([x.appearance, x.accessories]))
      })
      locations.forEach((l) => upsert(p.locations, { ...l, id: slugify(l.id || l.name) }, (x) => x.description))
      p.characters = p.characters.filter((c) => !remove.includes(c.id))
      p.locations = p.locations.filter((l) => !remove.includes(l.id))
    })
    return json({ saved: true, characters: p.characters.map((c) => ({ id: c.id, name: c.name, voice: c.voice })), locations: p.locations.map((l) => l.id), next: 'characters_generate' })
  })
)

server.registerTool(
  'characters_generate',
  {
    title: 'Sinh character sheet + ảnh bối cảnh',
    description:
      'Mỗi nhân vật 1 ảnh character sheet (nhiều góc + toàn bộ phụ kiện trong cùng 1 ảnh); mỗi bối cảnh 1 ảnh tham chiếu. Các ảnh này được đính kèm khi sinh storyboard để nhân vật/phụ kiện/bối cảnh nhất quán xuyên mọi tập.',
    inputSchema: { project_id: projectId, ids: z.array(z.string()).optional().describe('Chỉ sinh cho các id này'), force, wait_sec: waitSec }
  },
  safe(({ project_id, ids, force, wait_sec }) => launch('references', project_id, wait_sec, (log) => pipeline.generateReferences(project_id, { ids, force }, log)))
)

server.registerTool(
  'references_review',
  {
    title: 'Xem character sheet / bối cảnh',
    description: 'Trả ảnh thu nhỏ các character sheet + ảnh bối cảnh để duyệt cùng người dùng. Chưa ưng → characters_save sửa mô tả, hoặc characters_generate(ids, force).',
    inputSchema: { project_id: projectId, ids: z.array(z.string()).optional() },
    annotations: { readOnlyHint: true }
  },
  safe(async ({ project_id, ids }) => {
    const p = loadProject(project_id)
    const items = [...p.characters, ...(p.locations || [])].filter((x) => !ids?.length || ids.includes(x.id))
    const content = []
    const { resizeImage } = await import('./media.js')
    for (const x of items) {
      const file = abs(project_id, x.reference_image)
      content.push({ type: 'text', text: `${x.id} — ${x.name}${file && fs.existsSync(file) ? `: ${file}` : ': (chưa có ảnh)'}` })
      if (file && fs.existsSync(file)) {
        const preview = path.join(path.dirname(file), `${x.id}.preview.jpg`)
        await resizeImage(file, 640, preview)
        content.push({ type: 'image', data: fs.readFileSync(preview).toString('base64'), mimeType: 'image/jpeg' })
      }
    }
    return { content }
  })
)

// ═══════════════ Tập + kịch bản chi tiết ═══════════════

const lineSchema = z.object({
  speaker: z.string().describe(`id/tên nhân vật, hoặc "${pipeline.NARRATOR}" cho lời dẫn`),
  text: z.string().describe('Câu thoại (ngôn ngữ của dự án) — chính là nội dung phụ đề'),
  style: z
    .string()
    .regex(/^[\x20-\x7E]*$/, 'style phải viết bằng TIẾNG ANH (model TTS đọc to mọi chỉ dẫn tiếng Việt thành lời)')
    .optional()
    .describe('Thẻ cảm xúc ngắn BẰNG TIẾNG ANH, ví dụ "warm, storytelling", "whispering, scared", "shouting angrily". Tiếng Việt sẽ bị đọc to thành lời → bị từ chối'),
  pause_before: z.number().min(0).max(5).optional().describe('Khoảng lặng (giây) trước câu — tạo nhịp')
})

const sceneSchema = z.object({
  id: z.string().optional().describe('ID cảnh ("s01"...). Bỏ trống để tự đánh số. Giữ nguyên id khi sửa để không mất asset'),
  title: z.string().optional(),
  description: z.string().optional().describe('Chuyện gì xảy ra (cho người đọc kịch bản)'),
  location: z.string().optional().describe('id/tên bối cảnh đã khai báo trong characters_save'),
  characters: z.array(z.string()).optional().describe('Nhân vật CÓ MẶT TRONG KHUNG HÌNH (id/tên) — quyết định cả chế độ âm thanh auto'),
  image_prompt: z.string().describe('Khung hình đầu: cỡ cảnh, góc máy, bố cục, ánh sáng, nhân vật làm gì/biểu cảm. Không cần lặp ngoại hình nhân vật'),
  video_prompt: z.string().optional().describe('Chuyển động trong cảnh: hành động + chuyển động máy (dolly in, pan, orbit, handheld...). Bỏ trống = dùng image_prompt'),
  lines: z.array(lineSchema).optional().describe('Thoại + lời dẫn theo thứ tự (cũng là phụ đề)'),
  duration_sec: z.number().min(2).max(30).optional().describe('Độ dài cảnh khi không dùng TTS. Bỏ trống = tự ước theo lượng thoại'),
  transition: z.object({ type: z.enum(TRANSITIONS), duration: z.number().min(0).max(3).optional() }).optional().describe('Chuyển cảnh TỪ cảnh trước SANG cảnh này'),
  audio_mode: z.enum(['auto', 'tts', 'native']).optional().describe('Ghi đè chế độ âm thanh cho riêng cảnh'),
  native_volume: z.number().min(0).max(2).optional().describe('Âm lượng tiếng gốc của clip'),
  skip: z.boolean().optional().describe('Bỏ cảnh khỏi phim')
})

/** Đổi nội dung cảnh → bỏ asset không còn khớp, giữ phần không đổi. */
function carryAssets(project, oldScene, newScene) {
  if (!oldScene?.assets) return { assets: {}, approved: false }
  const key = (s) => ({
    image: JSON.stringify([s.image_prompt, s.characters, s.location]),
    audio: JSON.stringify([s.lines, pipeline.effectiveAudioMode(project, s)]),
    video: JSON.stringify([s.video_prompt, s.duration_sec, pipeline.effectiveAudioMode(project, s)])
  })
  const a = key(oldScene)
  const b = key(newScene)
  const assets = { ...oldScene.assets }
  let approved = !!oldScene.approved
  if (a.image !== b.image) {
    Object.assign(assets, { image: null, video: null, video_duration: null })
    approved = false
  }
  if (a.audio !== b.audio) Object.assign(assets, { audio: null, audio_duration: null, timeline: null })
  // Cảnh native: thoại nằm trong video → đổi thoại phải sinh lại video.
  if (a.video !== b.video || (a.audio !== b.audio && pipeline.effectiveAudioMode(project, newScene) === 'native')) {
    Object.assign(assets, { video: null, video_duration: null })
  }
  return { assets, approved }
}

function validateRefs(p, ep) {
  const bad = ep.scenes.flatMap((s) => [
    ...[...(s.characters || []), ...(s.lines || []).map((l) => l.speaker)]
      .filter((x) => x !== pipeline.NARRATOR && !findCharacter(p, x))
      .map((x) => `${s.id}: nhân vật "${x}"`),
    ...(s.location && !findLocation(p, s.location) ? [`${s.id}: bối cảnh "${s.location}"`] : [])
  ])
  if (bad.length) throw new Error(`Chưa khai báo trong characters_save — ${[...new Set(bad)].join('; ')}`)
}

server.registerTool(
  'episode_script_save',
  {
    title: 'Lưu kịch bản chi tiết 1 tập',
    description:
      'Lưu kịch bản chi tiết (văn bản đầy đủ) + phân cảnh của 1 tập. Không có episode_id → tạo tập mới ở cuối. mode=replace thay toàn bộ cảnh (giữ asset của cảnh cùng id nếu nội dung không đổi), append thêm cảnh vào cuối. ' +
      'BẮT BUỘC lần đầu lưu 1 tập: HỎI NGƯỜI DÙNG dùng độ dài mặc định của dự án hay chọn 3–8 phút, rồi truyền duration. Trả về độ dài ước tính so với mục tiêu.',
    inputSchema: {
      project_id: projectId,
      episode_id: episodeId.optional(),
      title: z.string().optional(),
      synopsis: z.string().optional(),
      script: z.string().optional().describe('Kịch bản chi tiết dạng văn bản (markdown): diễn biến, hành động, thoại — bản để người đọc'),
      scenes: z.array(sceneSchema).optional().describe('Phân cảnh theo đúng thứ tự trong tập'),
      mode: z.enum(['replace', 'append']).optional(),
      duration: z
        .union([z.literal('default'), episodeMinutes])
        .optional()
        .describe('Độ dài mục tiêu của tập: "default" = độ dài chuẩn của dự án, hoặc số phút 3–8 người dùng chọn. BẮT BUỘC khi tập chưa chốt độ dài — phải hỏi người dùng trước'),
      music: musicSchema.extend({ enabled: z.boolean().optional() }).optional().describe('Nhạc riêng cho tập (ghi đè nhạc series); enabled=false để tắt nhạc')
    }
  },
  safe(async ({ project_id, episode_id, title, synopsis, script, scenes, mode = 'replace', duration, music }) => {
    let id = episode_id
    const p = await updateProject(project_id, (p) => {
      let ep = id ? p.episodes.find((e) => e.id === id) : null
      if (!ep) {
        if (id && !/^e\d+$/.test(id)) throw new Error('episode_id mới phải có dạng e01, e02...')
        const number = id ? Number(id.slice(1)) : p.episodes.length + 1
        id ||= `e${String(number).padStart(2, '0')}`
        ep = { id, number, title: title || `Tập ${number}`, synopsis: '', script: '', scenes: [], music: null, output: null }
        p.episodes.push(ep)
        p.episodes.sort((a, b) => a.number - b.number)
      }
      const projectSec = p.episode_duration_sec || EPISODE_DEFAULT_SEC
      if (duration !== undefined) ep.target_duration_sec = duration === 'default' ? projectSec : Math.round(duration * 60)
      if (!ep.target_duration_sec) {
        throw new Error(
          `Tập ${ep.id} chưa chốt độ dài. HỎI NGƯỜI DÙNG: dùng độ dài mặc định của dự án (${projectSec / 60} phút) hay chọn ` +
            `từ ${EPISODE_MIN_SEC / 60} đến ${EPISODE_MAX_SEC / 60} phút? Rồi gọi lại với duration="default" hoặc duration=<số phút>.`
        )
      }
      if (title) ep.title = title
      if (synopsis) ep.synopsis = synopsis
      if (script) ep.script = script
      if (music) ep.music = { ...ep.music, ...music, file: ep.music?.prompt === music.prompt ? ep.music?.file : null }
      if (scenes) {
        const base = mode === 'append' ? ep.scenes : []
        const used = new Set(base.map((s) => s.id))
        let n = base.length
        const next = scenes.map((s) => {
          let sid = s.id
          if (!sid) {
            do sid = `s${String(++n).padStart(2, '0')}`
            while (used.has(sid))
          }
          used.add(sid)
          const scene = { ...s, id: sid }
          return { ...scene, ...carryAssets(p, ep.scenes.find((x) => x.id === sid), scene) }
        })
        ep.scenes = [...base, ...next]
      }
      validateRefs(p, ep)
    })
    return json({ saved: true, episode: episodeStatus(p, findEpisode(p, id)) })
  })
)

server.registerTool(
  'episode_get',
  {
    title: 'Trạng thái 1 tập',
    description: 'Tiến độ từng cảnh của tập (chế độ âm thanh, ảnh, duyệt, thoại, video, lỗi), phim cuối, next_steps. full=true kèm kịch bản + phân cảnh đầy đủ.',
    inputSchema: { project_id: projectId, episode_id: episodeId, full: z.boolean().optional() },
    annotations: { readOnlyHint: true }
  },
  safe(async ({ project_id, episode_id, full }) => {
    const p = loadProject(project_id)
    const ep = findEpisode(p, episode_id)
    return json(full ? { status: episodeStatus(p, ep), episode: ep } : episodeStatus(p, ep))
  })
)

server.registerTool(
  'scene_update',
  {
    title: 'Sửa 1 cảnh',
    description: 'Sửa từng trường của 1 cảnh. Asset bị ảnh hưởng tự xoá để sinh lại (đổi ảnh → phải duyệt lại), phần không đổi được giữ.',
    inputSchema: { project_id: projectId, episode_id: episodeId, scene_id: z.string(), changes: sceneSchema.partial().omit({ id: true }) }
  },
  safe(async ({ project_id, episode_id, scene_id, changes }) => {
    const p = await updateProject(project_id, (p) => {
      const ep = findEpisode(p, episode_id)
      const i = ep.scenes.findIndex((s) => s.id === scene_id)
      if (i < 0) findScene(ep, scene_id)
      const updated = { ...ep.scenes[i], ...changes }
      ep.scenes[i] = { ...updated, ...carryAssets(p, ep.scenes[i], updated) }
      validateRefs(p, ep)
    })
    const ep = findEpisode(p, episode_id)
    return json({ updated: scene_id, scene: findScene(ep, scene_id), episode: episodeStatus(p, ep) })
  })
)

server.registerTool(
  'prompt_preview',
  {
    title: 'Xem prompt sẽ gửi',
    description: 'Prompt ảnh/video thật sẽ gửi tới model cho 1 cảnh (đã ghép style, nhân vật, phụ kiện, bối cảnh, thoại), chế độ âm thanh và độ dài video. Soát trước khi tốn tiền.',
    inputSchema: { project_id: projectId, episode_id: episodeId, scene_id: z.string() },
    annotations: { readOnlyHint: true }
  },
  safe(async ({ project_id, episode_id, scene_id }) => {
    const p = loadProject(project_id)
    const s = findScene(findEpisode(p, episode_id), scene_id)
    return json({
      audio_mode: pipeline.effectiveAudioMode(p, s),
      image_prompt: pipeline.buildImagePrompt(p, s),
      video_prompt: pipeline.buildVideoPrompt(p, s),
      video_duration_sec: pipeline.targetVideoSec(p, s),
      models: config.models
    })
  })
)

// ═══════════════ Sinh asset từng tập (job nền) ═══════════════

server.registerTool(
  'episode_audio_generate',
  {
    title: 'Sinh thoại TTS cho tập',
    description:
      'Với các cảnh dùng TTS (lời dẫn / người nói ngoài khung hình): đọc từng câu bằng giọng nhân vật, xếp theo mốc thời gian (= phụ đề), đo độ dài. Rẻ và nhanh — chạy TRƯỚC episode_videos_generate vì video được sinh dài đúng bằng thoại.',
    inputSchema: { project_id: projectId, episode_id: episodeId, scene_ids: sceneIds, force, wait_sec: waitSec }
  },
  safe(({ project_id, episode_id, scene_ids, force, wait_sec }) =>
    launch('audio', project_id, wait_sec, (log) => pipeline.generateEpisodeAudio(project_id, episode_id, { sceneIds: scene_ids, force }, log))
  )
)

server.registerTool(
  'storyboard_generate',
  {
    title: 'Sinh storyboard (ảnh phân cảnh) cho tập',
    description: 'Sinh ảnh khung đầu cho các cảnh của tập, đính kèm character sheet + ảnh bối cảnh để nhất quán. Ảnh mới cần duyệt lại. Sau đó dùng storyboard_review.',
    inputSchema: { project_id: projectId, episode_id: episodeId, scene_ids: sceneIds, force, wait_sec: waitSec }
  },
  safe(({ project_id, episode_id, scene_ids, force, wait_sec }) =>
    launch('storyboard', project_id, wait_sec, (log) => pipeline.generateStoryboard(project_id, episode_id, { sceneIds: scene_ids, force }, log))
  )
)

server.registerTool(
  'storyboard_review',
  {
    title: 'Xem storyboard của tập',
    description: 'Trả ảnh thu nhỏ từng cảnh kèm thoại để duyệt cùng người dùng. Cảnh chưa ưng → scene_update (sửa prompt) hoặc storyboard_generate(scene_ids, force). Ưng → storyboard_approve.',
    inputSchema: { project_id: projectId, episode_id: episodeId, scene_ids: sceneIds },
    annotations: { readOnlyHint: true }
  },
  safe(async ({ project_id, episode_id, scene_ids }) => {
    const items = await pipeline.storyboardPreviews(project_id, episode_id, scene_ids)
    const content = []
    for (const it of items) {
      content.push({
        type: 'text',
        text: `── ${it.scene}${it.title ? ` · ${it.title}` : ''} ${it.approved ? '[ĐÃ DUYỆT]' : '[chưa duyệt]'}\n${it.image && it.preview ? it.image : '(chưa có ảnh)'}${it.lines?.length ? `\n${it.lines.join('\n')}` : ''}`
      })
      if (it.preview) content.push({ type: 'image', data: fs.readFileSync(it.preview).toString('base64'), mimeType: 'image/jpeg' })
    }
    return { content }
  })
)

server.registerTool(
  'storyboard_approve',
  {
    title: 'Duyệt storyboard',
    description: 'Đánh dấu ảnh phân cảnh đã duyệt (hoặc bỏ duyệt). Chỉ cảnh đã duyệt mới được sinh video.',
    inputSchema: { project_id: projectId, episode_id: episodeId, scene_ids: sceneIds, approved: z.boolean().optional().describe('Mặc định true') }
  },
  safe(async ({ project_id, episode_id, scene_ids, approved = true }) => {
    const p = await updateProject(project_id, (p) => {
      const ep = findEpisode(p, episode_id)
      if (!ep.scenes.length) throw new Error(`Tập ${episode_id} chưa có cảnh nào — episode_script_save trước`)
      for (const s of scene_ids?.length ? scene_ids.map((id) => findScene(ep, id)) : ep.scenes) {
        if (approved && !s.assets?.image) throw new Error(`Cảnh ${s.id} chưa có ảnh để duyệt`)
        s.approved = approved
      }
    })
    return json({ episode: episodeStatus(p, findEpisode(p, episode_id)) })
  })
)

server.registerTool(
  'episode_videos_generate',
  {
    title: 'Sinh video từ storyboard',
    description:
      'Biến từng ảnh phân cảnh thành clip (image-to-video), độ dài khớp thoại; cảnh native thì model tự nói thoại khớp khẩu hình. Yêu cầu tập đã ĐỦ ảnh và các cảnh đã duyệt. Bước tốn thời gian/chi phí nhất — vài phút mỗi clip.',
    inputSchema: {
      project_id: projectId,
      episode_id: episodeId,
      scene_ids: sceneIds,
      force,
      require_approval: z.boolean().optional().describe('Mặc định true'),
      wait_sec: waitSec
    }
  },
  safe(({ project_id, episode_id, scene_ids, force, require_approval, wait_sec }) =>
    launch('videos', project_id, wait_sec, (log) =>
      pipeline.generateEpisodeVideos(project_id, episode_id, { sceneIds: scene_ids, force, requireApproval: require_approval !== false }, log)
    )
  )
)

server.registerTool(
  'music_generate',
  {
    title: 'Sinh nhạc nền cho tập',
    description: 'Nhạc nền không lời (lặp cho đủ dài, tự hạ âm lượng khi có thoại lúc ghép). Mặc định dùng nhạc của tập, không có thì nhạc chủ đề series.',
    inputSchema: { project_id: projectId, episode_id: episodeId, prompt: z.string().optional(), force, wait_sec: waitSec }
  },
  safe(({ project_id, episode_id, prompt, force, wait_sec }) =>
    launch('music', project_id, wait_sec, (log) => pipeline.generateMusic(project_id, episode_id, { prompt, force }, log))
  )
)

const assembleSchema = {
  allow_stills: z.boolean().optional().describe('Cảnh chưa có video dùng ảnh tĩnh + zoom chậm — xem nháp nhịp phim trước khi tốn tiền sinh video'),
  default_transition: z.enum(TRANSITIONS).optional().describe('Cho cảnh không khai báo transition. Mặc định fade'),
  music: z.boolean().optional().describe('false = bỏ nhạc nền'),
  music_volume: z.number().min(0).max(1).optional(),
  ambience_volume: z.number().min(0).max(2).optional().describe('Tiếng gốc của clip ở cảnh TTS, mặc định 0.25'),
  subtitles: z.boolean().optional().describe('false = không phụ đề'),
  burn_subtitles: z.boolean().optional().describe('Đốt cứng phụ đề vào hình (cần ffmpeg có libass); mặc định track phụ đề mềm + .srt'),
  output_name: z.string().regex(/^[\w-]+$/).optional().describe('Tên file xuất, mặc định "final"')
}
const toAssembleOpts = (a) => ({
  allowStills: a.allow_stills,
  defaultTransition: a.default_transition,
  music: a.music,
  musicVolume: a.music_volume,
  ambienceVolume: a.ambience_volume,
  subtitles: a.subtitles,
  burnSubtitles: a.burn_subtitles,
  outputName: a.output_name
})

server.registerTool(
  'episode_assemble',
  {
    title: 'Ghép tập thành phim hoàn chỉnh',
    description:
      'Ghép mọi cảnh của tập theo thứ tự thành 1 mp4 đăng được ngay: khớp video với thoại, chuyển cảnh mượt (xfade + crossfade âm thanh, không đè thoại), nhạc nền tự hạ khi có thoại, ' +
      'chuẩn hoá -14 LUFS, fade đầu/cuối, phụ đề, ảnh bìa. Chỉ dùng ffmpeg — miễn phí, chạy lại thoải mái.',
    inputSchema: { project_id: projectId, episode_id: episodeId, ...assembleSchema, wait_sec: waitSec }
  },
  safe(({ project_id, episode_id, wait_sec, ...rest }) =>
    launch('assemble', project_id, wait_sec ?? 55, (log) => pipeline.assembleEpisode(project_id, episode_id, toAssembleOpts(rest), log))
  )
)

server.registerTool(
  'episode_run',
  {
    title: 'Chạy quy trình cho 1 tập',
    description: `Chạy tuần tự các bước còn thiếu của 1 tập: ${pipeline.STEPS.join(' → ')}. Bỏ qua asset đã có (trừ force). Khuyên dùng 2 lượt: ["references","audio","storyboard"] → duyệt storyboard → ["videos","music","assemble"].`,
    inputSchema: {
      project_id: projectId,
      episode_id: episodeId,
      steps: z.array(z.enum(pipeline.STEPS)).optional().describe('Mặc định tất cả'),
      force,
      require_approval: z.boolean().optional().describe('Mặc định true — bước videos dừng nếu storyboard chưa duyệt'),
      ...assembleSchema,
      wait_sec: waitSec
    }
  },
  safe(({ project_id, episode_id, steps, force, require_approval, wait_sec, ...rest }) =>
    launch('episode', project_id, wait_sec, (log) =>
      pipeline.runEpisode(project_id, episode_id, { steps, force, requireApproval: require_approval !== false, assembleOptions: toAssembleOpts(rest) }, log)
    )
  )
)

server.registerTool(
  'asset_import',
  {
    title: 'Dùng file có sẵn',
    description: 'Thay asset bằng file của bạn: ảnh/video/thoại cho 1 cảnh, ảnh tham chiếu cho nhân vật/bối cảnh, hoặc nhạc nền cho 1 tập.',
    inputSchema: {
      project_id: projectId,
      kind: z.enum(['scene_image', 'scene_video', 'scene_audio', 'reference', 'music']),
      episode_id: episodeId.optional().describe('Cần cho scene_* và music'),
      target: z.string().optional().describe('scene_id, hoặc id nhân vật/bối cảnh với kind=reference'),
      file_path: z.string().describe('Đường dẫn tuyệt đối tới file')
    }
  },
  safe(async ({ project_id, kind, episode_id, target, file_path }) => {
    if (!fs.existsSync(file_path)) throw new Error(`Không thấy file ${file_path}`)
    const ext = path.extname(file_path).toLowerCase()
    await updateProject(project_id, async (p) => {
      if (kind === 'reference') {
        const c = findCharacter(p, target || '') || findLocation(p, target || '')
        if (!c) throw new Error(`Không có nhân vật/bối cảnh "${target}"`)
        const sub = p.characters.includes(c) ? 'characters' : 'locations'
        const dest = path.join(ensureDir(path.join(projectDir(project_id), sub)), `${c.id}${ext}`)
        fs.copyFileSync(file_path, dest)
        c.reference_image = rel(project_id, dest)
        return
      }
      const ep = findEpisode(p, episode_id || '')
      if (kind === 'music') {
        const dest = path.join(ensureDir(path.join(projectDir(project_id), 'episodes', ep.id, 'music')), `music-imported${ext}`)
        fs.copyFileSync(file_path, dest)
        ep.music = { ...ep.music, prompt: ep.music?.prompt || 'imported', file: rel(project_id, dest) }
        return
      }
      const s = findScene(ep, target || '')
      const dir = sceneDir(project_id, ep.id, s.id)
      if (kind === 'scene_image') {
        const dest = path.join(dir, `image${ext}`)
        fs.copyFileSync(file_path, dest)
        s.assets = { ...s.assets, image: rel(project_id, dest), video: null, video_duration: null }
        s.approved = false
      } else if (kind === 'scene_video') {
        const dest = path.join(dir, 'video.mp4')
        fs.copyFileSync(file_path, dest)
        s.assets = { ...s.assets, video: rel(project_id, dest), video_duration: Number((await probe(dest)).duration.toFixed(3)) }
      } else {
        const dest = path.join(dir, 'audio.wav')
        const { duration } = await layoutLines({ lines: [{ file: file_path, speaker: 'imported', text: '' }], leadIn: 0, tail: 0.3, outFile: dest })
        s.assets = { ...s.assets, audio: rel(project_id, dest), audio_duration: Number(duration.toFixed(3)), timeline: [] }
        s.audio_mode = 'tts'
      }
    })
    return json({ imported: kind, target })
  })
)

// ═══════════════ Quota ═══════════════

server.registerTool(
  'usage_report',
  {
    title: 'Quota đã dùng',
    description:
      'Xem lại quota API đã dùng (đọc từ sổ usage.jsonl — ghi mọi lần gọi kể cả lỗi): số lần gọi, ảnh, giây video/âm thanh, token, thời gian API, số lần SINH LẠI (quota tốn thêm do làm lại), lỗi gần nhất, ' +
      'chi phí ước tính (nếu có pricing.json). Chia nhóm theo kind / model / purpose / episode / scene / day.',
    inputSchema: {
      project_id: projectId,
      episode_id: episodeId.optional().describe('Chỉ tính 1 tập; bỏ trống = cả dự án (gồm character sheet, bối cảnh)'),
      group_by: z.enum(USAGE_GROUPS).optional().describe('Mặc định kind (image / video / tts / music)'),
      since: z.string().optional().describe('Chỉ tính từ thời điểm ISO này, ví dụ "2026-10-15"'),
      entries: z.number().int().min(0).max(200).optional().describe('Kèm N lần gọi gần nhất (chi tiết từng dòng)')
    },
    annotations: { readOnlyHint: true }
  },
  safe(async ({ project_id, episode_id, group_by, since, entries }) => {
    const p = loadProject(project_id)
    if (episode_id) findEpisode(p, episode_id)
    return json(usageReport(project_id, { episodeId: episode_id, groupBy: group_by, since, entries }))
  })
)

// ═══════════════ Job ═══════════════

server.registerTool(
  'job_status',
  {
    title: 'Theo dõi job',
    description: 'Trạng thái job nền: running / succeeded / completed_with_errors (một số mục lỗi — xem result.failed) / failed. wait_sec>0 để chờ (tối đa 55s mỗi lần) thay vì poll liên tục.',
    inputSchema: { job_id: z.string(), wait_sec: waitSec },
    annotations: { readOnlyHint: true }
  },
  safe(async ({ job_id, wait_sec }) => json(wait_sec ? await jobs.waitJob(job_id, wait_sec) : jobs.view(jobs.getJob(job_id), 30)))
)

server.registerTool(
  'job_list',
  { title: 'Danh sách job', description: 'Các job trong phiên server hiện tại.', inputSchema: { project_id: projectId.optional() }, annotations: { readOnlyHint: true } },
  safe(async ({ project_id }) => json(jobs.listJobs(project_id)))
)

ensureDir(config.projectsDir)
await server.connect(new StdioServerTransport())
startDashboard()
console.error(`[film-studio] MCP server sẵn sàng — projects: ${config.projectsDir}${config.apiKey ? '' : ' — CẢNH BÁO: chưa có GEMINI_API_KEY'}`)
