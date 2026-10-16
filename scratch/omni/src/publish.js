import fs from 'node:fs'
import path from 'node:path'
import { RESOLUTIONS } from './config.js'
import * as media from './media.js'
import { effectiveAudioMode, estimateSceneSec } from './pipeline.js'
import { abs, ensureDir, episodeDir, exists, findEpisode, loadProject, rel, scenesOf, slugify } from './project.js'

/**
 * Bộ đăng bài 1 tập (offline, chạy lại thoải mái): từ kịch bản + final.mp4 sinh
 *   episodes/<ep>/publish/
 *     publish.json            manifest cho publisher (tiêu đề, mô tả, hashtag, chapter, file từng nền tảng)
 *     <platform>.txt          tiêu đề + mô tả/caption để dán tay
 *     thumbnail.jpg           ảnh bìa ngang (≤ 2MB)   · cover-vertical.jpg  ảnh bìa dọc
 *     captions.<lang>.srt     phụ đề
 *     vertical.mp4            bản dọc 9:16 đủ tập     · vertical-<N>s.mp4   teaser cắt ở ranh giới cảnh
 * Chỉnh sửa của người dùng (tiêu đề, mô tả, hashtag, chapter...) lưu ở episode.publish trong project.json
 * nên chạy lại không mất. Phần `uploads` của publish.json do publisher ghi — giữ nguyên khi chạy lại.
 */

export const PLATFORMS = {
  youtube: { label: 'YouTube (video ngang)', vertical: false },
  shorts: { label: 'YouTube Shorts', vertical: true, maxSec: 180 },
  tiktok: { label: 'TikTok', vertical: true, maxSec: 600 },
  reels: { label: 'Facebook Reels', vertical: true, maxSec: 90 },
  facebook: { label: 'Facebook (video ngang trên Page)', vertical: false }
}

const LIMITS = { youtubeTitle: 100, youtubeDescBytes: 5000, youtubeTags: 500, tiktokCaption: 2200, chapterMinSec: 10 }
const TEASER_MIN_SEC = 15

export const fmtTime = (sec) => {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

// YouTube từ chối "<" ">" trong tiêu đề/mô tả.
const clean = (t) => String(t || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim()
const cut = (t, n) => (t.length <= n ? t : `${t.slice(0, n - 1).trimEnd()}…`)
const pascal = (t) => slugify(t).split('-').filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join('')
const tag = (t) => (t.startsWith('#') ? t : `#${pascal(t)}`)
const dedupe = (list) => [...new Map(list.filter((x) => x && x !== '#').map((x) => [x.toLowerCase(), x])).values()]

/** Mốc bắt đầu từng cảnh: lấy từ lần ghép thật; phim ghép bằng bản cũ thì ước theo độ dài cảnh rồi co giãn cho khớp độ dài thật. */
export function sceneStarts(project, ep) {
  const scenes = scenesOf(ep)
  if (ep.output?.scene_starts?.length) return { source: 'assembled', starts: ep.output.scene_starts }
  const lengths = scenes.map((s, i) => {
    const t = s.transition || { type: 'fade', duration: 0.6 }
    const overlap = i && t.type !== 'cut' && effectiveAudioMode(project, s) !== 'tts' ? (t.duration ?? 0.6) : 0
    return Math.max(0, estimateSceneSec(project, s) - overlap)
  })
  const total = lengths.reduce((a, b) => a + b, 0) || 1
  const scale = (ep.output?.duration_sec || total) / total
  let t = 0
  const starts = scenes.map((s, i) => {
    const start = t
    t += lengths[i] * scale
    return { id: s.id, start: Number(start.toFixed(2)) }
  })
  return { source: 'estimated', starts }
}

/**
 * Chapter YouTube: bắt đầu 0:00, ≥ 3 mục, mỗi mục ≥ 10s, tăng dần.
 * Người dùng đã chốt (episode.publish.chapters = [{scene_id, title}]) thì dùng nguyên; không thì chia đều theo thời gian,
 * chốt tại ranh giới cảnh gần nhất, đặt tên theo beats của tập (đủ số) hoặc tên cảnh.
 */
export function buildChapters(project, ep, duration, override) {
  const { source, starts } = sceneStarts(project, ep)
  const byId = new Map(scenesOf(ep).map((s) => [s.id, s]))
  const label = (s) => cut(clean(s?.title || s?.description || ''), 60)
  let picked
  if (override?.length) {
    picked = override.map((c) => {
      const st = starts.find((x) => x.id === c.scene_id)
      if (!st) throw new Error(`chapter: không có cảnh "${c.scene_id}" trong tập ${ep.id}`)
      return { start: st.start, scene_id: c.scene_id, title: cut(clean(c.title), 60) }
    })
    picked.sort((a, b) => a.start - b.start)
    picked[0].start = 0
  } else {
    const beats = (ep.beats || []).map(clean).filter(Boolean)
    const maxK = Math.floor(duration / LIMITS.chapterMinSec)
    const k = beats.length >= 3 && beats.length <= maxK ? beats.length : Math.min(8, maxK, Math.max(3, Math.round(duration / 45)))
    picked = []
    for (let i = 0; i < k; i++) {
      const target = (i * duration) / k
      const prev = picked.at(-1)
      const candidates = starts.filter((x) => (prev ? x.start >= prev.start + LIMITS.chapterMinSec : x.start === starts[0].start) && duration - x.start >= LIMITS.chapterMinSec)
      if (!candidates.length) break
      const best = candidates.reduce((a, b) => (Math.abs(b.start - target) < Math.abs(a.start - target) ? b : a))
      picked.push({ start: i ? best.start : 0, scene_id: best.id, title: '' })
    }
    const useBeats = beats.length === picked.length
    picked.forEach((c, i) => (c.title = (useBeats ? cut(beats[i], 60) : label(byId.get(c.scene_id))) || (i ? `Phần ${i + 1}` : 'Mở đầu')))
  }
  const warnings = []
  const gaps = picked.some((c, i) => i && c.start - picked[i - 1].start < LIMITS.chapterMinSec) || (picked.length && duration - picked.at(-1).start < LIMITS.chapterMinSec)
  if (picked.length < 3 || gaps) {
    warnings.push(`Chapter không đạt chuẩn YouTube (≥ 3 mục, mỗi mục ≥ ${LIMITS.chapterMinSec}s) → bỏ mục lục khỏi mô tả.`)
    return { chapters: [], source, warnings }
  }
  if (source === 'estimated') warnings.push('Mốc chapter là ƯỚC TÍNH (phim ghép bằng bản cũ) — episode_assemble lại để có mốc chính xác.')
  return { chapters: picked.map((c) => ({ ...c, time: fmtTime(c.start) })), source, warnings }
}

function buildHashtags(project, ep, extra) {
  const cast = (project.characters || []).filter((c) => /chính|main|protagonist/i.test(c.role || '')).slice(0, 2)
  const animated = /anime|hoạt hình|cartoon|2d|3d|màu nước|watercolor|ghibli|pixar|chibi/i.test(project.style || '')
  return dedupe([
    ...(extra || []).map(tag),
    tag(project.title),
    animated ? '#hoathinh' : null,
    '#phimngan',
    ...cast.map((c) => tag(c.name)),
    project.language === 'vi' ? '#phimvietnam' : null,
    animated ? '#phimhoathinh' : null
  ]).slice(0, 8)
}

function buildTags(project, ep) {
  const out = []
  let len = 0
  for (const t of dedupe([project.title, ep.title, ...(project.characters || []).map((c) => c.name), 'phim hoạt hình', 'phim ngắn', 'hoạt hình AI'].map(clean))) {
    const cost = t.length + (t.includes(' ') ? 2 : 0) + (out.length ? 1 : 0)
    if (len + cost > LIMITS.youtubeTags) break
    out.push(t)
    len += cost
  }
  return out
}

function neighbourLinks(project, ep) {
  const link = (e) => {
    if (!e) return null
    const m = readManifest(project.id, e.id)
    const url = m?.uploads?.youtube?.url
    return url ? `Tập ${e.number}: ${clean(e.title)} — ${url}` : null
  }
  const i = project.episodes.findIndex((e) => e.id === ep.id)
  return [link(project.episodes[i - 1]) && `◀ ${link(project.episodes[i - 1])}`, link(project.episodes[i + 1]) && `▶ ${link(project.episodes[i + 1])}`].filter(Boolean)
}

function buildDescription({ project, ep, total, intro, chapters, hashtags, links }) {
  // KHÔNG đưa bible.ending / cliffhanger vào — lộ nội dung.
  const head = clean(intro ?? ep.hook ?? '')
  const synopsis = clean(ep.synopsis)
  const cast = (project.characters || []).slice(0, 6).map((c) => c.name).join(', ')
  const parts = [
    head,
    synopsis && synopsis !== head ? synopsis : '',
    `📺 ${clean(project.title)} — Tập ${ep.number}${total > 1 ? `/${total}` : ''}: ${clean(ep.title)}${project.logline ? `\n${clean(project.logline)}` : ''}`,
    chapters.length ? `⏱ Mục lục\n${chapters.map((c) => `${c.time} ${c.title}`).join('\n')}` : '',
    links.join('\n'),
    cast ? `Nhân vật: ${cast}` : '',
    'Phim được làm bằng AI: hình ảnh, chuyển động, giọng đọc và nhạc tạo bằng Gemini.',
    hashtags.join(' ')
  ]
  return parts.filter(Boolean).join('\n\n')
}

const manifestFile = (projectId, episodeId) => path.join(episodeDir(projectId, episodeId), 'publish', 'publish.json')

export function readManifest(projectId, episodeId) {
  try {
    return JSON.parse(fs.readFileSync(manifestFile(projectId, episodeId), 'utf8'))
  } catch {
    return null
  }
}

export function writeManifest(projectId, episodeId, manifest) {
  const file = manifestFile(projectId, episodeId)
  ensureDir(path.dirname(file))
  fs.writeFileSync(`${file}.tmp`, JSON.stringify(manifest, null, 2))
  fs.renameSync(`${file}.tmp`, file)
}

/** Teaser dọc: cắt ở ranh giới cảnh cuối cùng còn ≤ giới hạn (tối thiểu 15s), không thì cắt cứng ở giới hạn. */
function teaserLength(starts, duration, maxSec) {
  if (duration <= maxSec) return null
  const boundary = starts.map((x) => x.start).filter((t) => t >= TEASER_MIN_SEC && t <= maxSec).at(-1)
  return Number((boundary ?? maxSec).toFixed(2))
}

/** Render lại chỉ khi nguồn hoặc tham số đổi. */
async function render(prev, key, outFile, sourceMtime, params, fn, log) {
  const old = prev?.renders?.[key]
  if (fs.existsSync(outFile) && old && old.source_mtime === sourceMtime && JSON.stringify(old.params) === JSON.stringify(params)) return old
  log(`render ${path.basename(outFile)}`)
  await fn()
  return { source_mtime: sourceMtime, params, rendered_at: new Date().toISOString() }
}

export async function buildPublishKit(projectId, episodeId, { platforms = ['youtube', 'shorts', 'tiktok', 'reels'], force = false } = {}, log = () => {}) {
  const project = loadProject(projectId)
  const ep = findEpisode(project, episodeId)
  if (!exists(projectId, ep.output?.video)) throw new Error(`Tập ${episodeId} chưa có final.mp4 — episode_assemble trước.`)
  const bad = platforms.filter((p) => !PLATFORMS[p])
  if (bad.length) throw new Error(`Nền tảng không hỗ trợ: ${bad.join(', ')}. Có: ${Object.keys(PLATFORMS).join(', ')}`)

  const o = ep.publish || {}
  const outDir = ensureDir(path.join(episodeDir(projectId, episodeId), 'publish'))
  const final = abs(projectId, ep.output.video)
  const sourceMtime = fs.statSync(final).mtimeMs
  const duration = ep.output.duration_sec || (await media.probe(final)).duration
  const prev = force ? null : readManifest(projectId, episodeId)
  const warnings = []
  if (ep.output.stills_used?.length) warnings.push(`⚠ final.mp4 là bản NHÁP ảnh tĩnh (cảnh chưa có video: ${ep.output.stills_used.join(', ')}) — chưa nên đăng.`)

  // ── Chữ ──
  const total = project.episodes.length
  const baseTitle = clean(o.title || `${project.title} — Tập ${ep.number}: ${ep.title}`)
  if (baseTitle.length > LIMITS.youtubeTitle) warnings.push(`Tiêu đề dài ${baseTitle.length} ký tự > ${LIMITS.youtubeTitle} — đã cắt; nên tự rút gọn.`)
  const title = cut(baseTitle, LIMITS.youtubeTitle)
  const hashtags = buildHashtags(project, ep, o.hashtags)
  const { chapters, source: chapterSource, warnings: cw } = buildChapters(project, ep, duration, o.chapters)
  warnings.push(...cw)
  const links = neighbourLinks(project, ep)
  let description = buildDescription({ project, ep, total, intro: o.description_intro, chapters, hashtags, links })
  if (Buffer.byteLength(description) > LIMITS.youtubeDescBytes) {
    warnings.push('Mô tả > 5000 byte — đã bỏ phần tóm tắt.')
    description = buildDescription({ project, ep: { ...ep, synopsis: '' }, total, intro: o.description_intro, chapters, hashtags, links })
  }
  const short = clean(o.description_intro ?? ep.hook ?? ep.synopsis ?? '')
  const caption = (extra) => cut(`${title}\n\n${short}\n\n${dedupe([...hashtags, ...extra]).join(' ')}`, LIMITS.tiktokCaption)

  // ── File chung ──
  const files = {}
  const renders = {}
  const coverSrc = abs(projectId, ep.output.cover)
  if (coverSrc && fs.existsSync(coverSrc)) {
    const thumb = path.join(outDir, 'thumbnail.jpg')
    fs.copyFileSync(coverSrc, thumb)
    if (fs.statSync(thumb).size > 2 * 1024 * 1024) await media.compressImage(coverSrc, thumb)
    files.thumbnail = rel(projectId, thumb)
  } else warnings.push('Chưa có cover.jpg — episode_assemble lại để có ảnh bìa.')
  const srtSrc = abs(projectId, ep.output.srt)
  if (srtSrc && fs.existsSync(srtSrc)) {
    const srt = path.join(outDir, `captions.${project.language || 'vi'}.srt`)
    fs.copyFileSync(srtSrc, srt)
    files.captions = rel(projectId, srt)
  }

  // ── Bản dọc ──
  const wantVertical = platforms.some((p) => PLATFORMS[p].vertical)
  const verticalMode = o.vertical_mode || 'blur'
  const [vw, vh] = RESOLUTIONS[project.resolution]?.['9:16'] || RESOLUTIONS['720p']['9:16']
  const { starts } = sceneStarts(project, ep)
  const verticalFor = {}
  if (wantVertical) {
    if (project.aspect_ratio === '9:16') {
      for (const p of platforms.filter((x) => PLATFORMS[x].vertical)) verticalFor[p] = { file: ep.output.video, duration_sec: duration }
    } else {
      const full = path.join(outDir, 'vertical.mp4')
      renders.vertical = await render(prev, 'vertical', full, sourceMtime, { mode: verticalMode, w: vw, h: vh }, () => media.reframeVertical({ input: final, outFile: full, width: vw, height: vh, mode: verticalMode }), log)
      files.vertical = rel(projectId, full)
      for (const p of platforms.filter((x) => PLATFORMS[x].vertical)) {
        const len = teaserLength(starts, duration, PLATFORMS[p].maxSec)
        if (!len) {
          verticalFor[p] = { file: files.vertical, duration_sec: duration }
          continue
        }
        const key = `vertical-${PLATFORMS[p].maxSec}s`
        const out = path.join(outDir, `${key}.mp4`)
        renders[key] = await render(prev, key, out, sourceMtime, { mode: verticalMode, w: vw, h: vh, len }, () => media.reframeVertical({ input: final, outFile: out, width: vw, height: vh, mode: verticalMode, maxSec: len }), log)
        files[key] = rel(projectId, out)
        verticalFor[p] = { file: files[key], duration_sec: len, teaser: true }
        warnings.push(`${PLATFORMS[p].label}: tập dài ${fmtTime(duration)} > giới hạn ${fmtTime(PLATFORMS[p].maxSec)} → dùng teaser ${fmtTime(len)} (${key}.mp4), cắt ở ranh giới cảnh.`)
      }
    }
    if (coverSrc && fs.existsSync(coverSrc)) {
      const vc = path.join(outDir, 'cover-vertical.jpg')
      renders.cover_vertical = await render(prev, 'cover_vertical', vc, fs.statSync(coverSrc).mtimeMs, { mode: verticalMode, w: vw, h: vh }, () => media.reframeVerticalImage({ input: coverSrc, outFile: vc, width: vw, height: vh, mode: verticalMode }), log)
      files.cover_vertical = rel(projectId, vc)
    }
  }

  // ── Từng nền tảng ──
  const madeForKids = o.made_for_kids ?? null
  // YouTube chỉ yêu cầu khai báo khi nội dung AI trông như THẬT; hoạt hình rõ ràng không thật → không.
  const alteredContent = o.altered_content ?? /realistic|photoreal|tả thực|chân thực|live.?action|người thật/i.test(project.style || '')
  if (platforms.some((p) => p === 'youtube' || p === 'shorts') && madeForKids == null) {
    warnings.push('Chưa chốt "dành cho trẻ em" (made_for_kids) — YouTube BẮT BUỘC chọn; hỏi người dùng rồi lưu bằng episode_publish_kit(made_for_kids=...).')
  }
  const out = {}
  for (const p of platforms) {
    if (p === 'youtube') {
      out.youtube = {
        file: ep.output.video, title, description, tags: buildTags(project, ep), hashtags, chapters, thumbnail: files.thumbnail || null,
        captions: files.captions ? { file: files.captions, language: project.language || 'vi' } : null,
        category: 'Film & Animation', made_for_kids: madeForKids, altered_content: alteredContent, visibility: 'private', duration_sec: duration
      }
    } else if (p === 'shorts') {
      const shortsTags = dedupe([...hashtags.slice(0, 2), '#Shorts'])
      out.shorts = { ...verticalFor.shorts, title: cut(`${title} ${shortsTags.join(' ')}`, LIMITS.youtubeTitle), description: `${short}\n\n${shortsTags.join(' ')}`.trim(), made_for_kids: madeForKids, altered_content: alteredContent, visibility: 'private' }
    } else if (p === 'tiktok') {
      out.tiktok = { ...verticalFor.tiktok, caption: caption(['#fyp']), cover: files.cover_vertical || null, visibility: 'private', ai_generated: true }
    } else if (p === 'reels') {
      out.reels = { ...verticalFor.reels, caption: caption(['#reels']), cover: files.cover_vertical || null, visibility: 'draft' }
    } else if (p === 'facebook') {
      out.facebook = { file: ep.output.video, title, description, thumbnail: files.thumbnail || null, captions: files.captions ? { file: files.captions, language: project.language || 'vi' } : null, visibility: 'draft' }
    }
  }
  for (const [p, d] of Object.entries(out)) {
    const body = d.caption ?? `${d.title}\n\n${d.description}`
    fs.writeFileSync(path.join(outDir, `${p}.txt`), `${body}\n`)
  }

  const manifest = {
    version: 1,
    project_id: projectId,
    episode_id: episodeId,
    generated_at: new Date().toISOString(),
    source: { video: ep.output.video, duration_sec: duration, assembled_at: ep.output.assembled_at, chapters: chapterSource },
    language: project.language || 'vi',
    files,
    platforms: { ...(prev?.platforms || {}), ...out },
    warnings,
    renders: { ...(prev?.renders || {}), ...renders },
    uploads: readManifest(projectId, episodeId)?.uploads || {}
  }
  writeManifest(projectId, episodeId, manifest)
  const absOf = (r) => (r ? abs(projectId, r) : null)
  return {
    dir: outDir,
    manifest: manifestFile(projectId, episodeId),
    title,
    hashtags,
    chapters: chapters.map((c) => `${c.time} ${c.title}`),
    platforms: Object.fromEntries(Object.entries(out).map(([p, d]) => [p, { file: absOf(d.file), duration: fmtTime(d.duration_sec ?? duration), teaser: d.teaser || undefined }])),
    files: Object.fromEntries(Object.entries(files).map(([k, v]) => [k, absOf(v)])),
    warnings,
    uploads: manifest.uploads
  }
}

