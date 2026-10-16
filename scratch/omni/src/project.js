import fs from 'node:fs'
import path from 'node:path'
import { config } from './config.js'

/**
 * 1 project = 1 dự án phim (series), chia thành 1..n tập:
 *   project.json                    manifest: bible, nhân vật, bối cảnh, các tập + cảnh, trạng thái asset
 *   characters/<id>.jpg             character sheet (nhân vật + toàn bộ phụ kiện trong 1 ảnh)
 *   locations/<id>.jpg              ảnh tham chiếu bối cảnh lặp lại
 *   episodes/<ep>/scenes/<sc>/      image, line-XX.wav, audio.wav, video.mp4, segment.mp4
 *   episodes/<ep>/music/            nhạc nền của tập
 *   episodes/<ep>/output/           final.mp4, final.srt, cover.jpg
 * Asset lưu đường dẫn TƯƠNG ĐỐI so với thư mục project để project di chuyển được.
 */

const locks = new Map()

/** Mọi tập trong 1 dự án dài như nhau: mặc định 3 phút, cho phép 3–8 phút. */
export const EPISODE_MIN_SEC = 180
export const EPISODE_MAX_SEC = 480
export const EPISODE_DEFAULT_SEC = 180
/** Lệch quá ngưỡng này so với độ dài mục tiêu thì cảnh báo. */
const DURATION_TOLERANCE = 0.15

export function slugify(text) {
  const base = String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return base || 'film'
}

export function projectDir(projectId) {
  if (!/^[a-z0-9-]+$/.test(projectId)) throw new Error(`project_id không hợp lệ: "${projectId}"`)
  return path.join(config.projectsDir, projectId)
}

export const abs = (projectId, relPath) => (relPath ? path.join(projectDir(projectId), relPath) : null)
export const rel = (projectId, absPath) => path.relative(projectDir(projectId), absPath)
export const exists = (projectId, relPath) => !!relPath && fs.existsSync(abs(projectId, relPath))

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function episodeDir(projectId, episodeId) {
  return ensureDir(path.join(projectDir(projectId), 'episodes', episodeId))
}

export function sceneDir(projectId, episodeId, sceneId) {
  return ensureDir(path.join(projectDir(projectId), 'episodes', episodeId, 'scenes', sceneId))
}

export function createProject(input) {
  ensureDir(config.projectsDir)
  let id = slugify(input.title)
  for (let i = 2; fs.existsSync(path.join(config.projectsDir, id)); i++) id = `${slugify(input.title)}-${i}`
  const now = new Date().toISOString()
  const project = {
    id,
    title: input.title,
    logline: input.logline || '',
    language: input.language || 'vi',
    aspect_ratio: input.aspect_ratio || '16:9',
    resolution: input.resolution || '720p',
    style: input.style || '',
    audio_mode: input.audio_mode || 'auto',
    episode_duration_sec: input.episode_duration_sec || EPISODE_DEFAULT_SEC,
    narrator_voice: 'Charon',
    bible: null,
    characters: [],
    locations: [],
    music: null,
    episodes: [],
    created_at: now,
    updated_at: now
  }
  ensureDir(projectDir(id))
  writeManifest(project)
  return project
}

export function listProjects() {
  if (!fs.existsSync(config.projectsDir)) return []
  return fs
    .readdirSync(config.projectsDir)
    .filter((d) => fs.existsSync(path.join(config.projectsDir, d, 'project.json')))
    .map((d) => loadProject(d))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

export function loadProject(projectId) {
  const file = path.join(projectDir(projectId), 'project.json')
  if (!fs.existsSync(file)) throw new Error(`Không tìm thấy project "${projectId}". Dùng project_list để xem các project hiện có.`)
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function writeManifest(project) {
  project.updated_at = new Date().toISOString()
  const file = path.join(projectDir(project.id), 'project.json')
  const tmp = `${file}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(project, null, 2))
  fs.renameSync(tmp, file)
}

/**
 * Đọc-sửa-ghi manifest tuần tự theo project: nhiều job sinh asset song song
 * cùng cập nhật project.json, không được ghi đè lẫn nhau.
 */
export async function updateProject(projectId, mutate) {
  const prev = locks.get(projectId) || Promise.resolve()
  let release
  const current = new Promise((r) => (release = r))
  locks.set(projectId, prev.then(() => current))
  await prev
  try {
    const project = loadProject(projectId)
    const result = await mutate(project)
    writeManifest(project)
    return result === undefined ? project : result
  } finally {
    release()
  }
}

export function findEpisode(project, episodeId) {
  const ep = project.episodes.find((e) => e.id === episodeId)
  if (!ep) {
    const known = project.episodes.map((e) => e.id).join(', ') || '(chưa có tập nào — dùng series_bible_save hoặc episode_script_save)'
    throw new Error(`Không có tập "${episodeId}". Các tập: ${known}`)
  }
  return ep
}

export function findScene(episode, sceneId) {
  const scene = episode.scenes.find((s) => s.id === sceneId)
  if (!scene) throw new Error(`Tập ${episode.id} không có cảnh "${sceneId}". Các cảnh: ${episode.scenes.map((s) => s.id).join(', ')}`)
  return scene
}

const byIdOrName = (list, key) => {
  const k = String(key).toLowerCase()
  return list.find((x) => x.id === k || x.name.toLowerCase() === k || x.id === slugify(key)) || null
}
export const findCharacter = (project, key) => byIdOrName(project.characters, key)
export const findLocation = (project, key) => (key ? byIdOrName(project.locations || [], key) : null)

/**
 * Look = một trạng thái ngoại hình của nhân vật (vd "sau" khi trang điểm + thay đồ), có character sheet riêng.
 * Cảnh chọn look qua `scene.looks = { <nhân vật>: <look> }`; không chọn → dáng gốc (appearance/accessories của nhân vật).
 */
export const findLook = (character, lookId) => (lookId ? (character.looks || []).find((l) => l.id === slugify(lookId)) || null : null)

/** Nhân vật như nó xuất hiện trong 1 look: appearance + accessories + ảnh tham chiếu của look (accessories không khai báo → kế thừa dáng gốc). */
export function characterAs(character, lookId) {
  const look = findLook(character, lookId)
  if (!look) return character
  return {
    ...character,
    look: look.id,
    appearance: look.appearance,
    accessories: look.accessories ?? character.accessories,
    reference_image: look.reference_image
  }
}

/** Mọi ảnh tham chiếu cần có: nhân vật (dáng gốc), từng look (id "nhân-vật:look"), bối cảnh. */
export function referenceItems(project) {
  return [
    ...project.characters.flatMap((c) => [
      { kind: 'character', id: c.id, name: c.name, item: c },
      ...(c.looks || []).map((l) => ({ kind: 'look', id: `${c.id}:${l.id}`, name: `${c.name} (${l.name || l.id})`, item: l, owner: c }))
    ]),
    ...(project.locations || []).map((l) => ({ kind: 'location', id: l.id, name: l.name, item: l }))
  ]
}

export const scenesOf = (episode) => episode.scenes.filter((s) => !s.skip)

// ───────────── Tóm tắt tiến độ + bước tiếp theo (để agent nào đọc cũng biết đang ở đâu) ─────────────

const fmtMin = (sec) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`

/**
 * So kịch bản (ước tính) và phim đã ghép (thực tế) với độ dài mục tiêu của tập.
 * `h` = helper từ pipeline.js (effectiveAudioMode, estimateEpisodeDuration) — truyền vào để tránh import vòng.
 */
export function episodeDuration(project, ep, h) {
  const target = ep.target_duration_sec || null
  const estimated = ep.scenes.length ? Math.round(h.estimateEpisodeDuration(project, ep)) : 0
  const actual = ep.output?.duration_sec ?? null
  const result = {
    target_sec: target,
    target: target ? fmtMin(target) : 'chưa chốt — hỏi người dùng',
    estimated_sec: estimated,
    estimated: fmtMin(estimated),
    ...(actual != null ? { assembled_sec: actual, assembled: fmtMin(actual) } : {})
  }
  const warnings = []
  if (target && ep.scenes.length) {
    const gap = estimated - target
    if (Math.abs(gap) > target * DURATION_TOLERANCE) {
      const avgScene = estimated / Math.max(1, ep.scenes.filter((x) => !x.skip).length)
      // Cảnh thật thường 6–8s; kịch bản nháp có cảnh quá ngắn thì vẫn quy đổi theo 6s để gợi ý hợp lý.
      const scenes = Math.max(1, Math.round(Math.abs(gap) / Math.max(avgScene, 6)))
      warnings.push(
        `⚠ Độ dài: kịch bản ước tính ${fmtMin(estimated)} ${gap < 0 ? 'NGẮN' : 'DÀI'} hơn mục tiêu ${fmtMin(target)} ${Math.abs(Math.round(gap))}s → ` +
          `${gap < 0 ? 'thêm' : 'bớt'} ~${scenes} cảnh (hoặc ${gap < 0 ? 'thêm' : 'cắt'} thoại) bằng episode_script_save TRƯỚC khi sinh video.`
      )
    }
  }
  if (target && actual != null && Math.abs(actual - target) > target * DURATION_TOLERANCE) {
    warnings.push(`⚠ Phim đã ghép dài ${fmtMin(actual)}, lệch mục tiêu ${fmtMin(target)}.`)
  }
  return { duration: result, warnings }
}

export function summarizeEpisode(project, ep, h) {
  const { effectiveAudioMode } = h
  const has = (p) => exists(project.id, p)
  const scenes = ep.scenes.map((s) => {
    const mode = effectiveAudioMode(project, s)
    return {
      id: s.id,
      title: s.title,
      skip: s.skip || undefined,
      audio_mode: mode,
      image: has(s.assets?.image),
      approved: !!s.approved,
      tts_audio: mode === 'tts' && s.lines?.length ? has(s.assets?.audio) : 'n/a',
      audio_duration: s.assets?.audio_duration ?? undefined,
      video: has(s.assets?.video),
      errors: s.errors && Object.keys(s.errors).length ? s.errors : undefined
    }
  })
  const active = scenes.filter((s) => !s.skip)
  const missing = (pred) => active.filter(pred).map((s) => s.id)
  const { duration, warnings } = episodeDuration(project, ep, h)
  const next = [...warnings]
  if (!ep.scenes.length) next.push(`episode_script_save(episode_id="${ep.id}") — viết kịch bản chi tiết + phân cảnh`)
  else {
    const noAudio = missing((s) => s.tts_audio === false)
    const noImage = missing((s) => !s.image)
    const unapproved = missing((s) => s.image && !s.approved)
    const noVideo = missing((s) => !s.video)
    // Clip tối đa videoMaxSec giây — thoại TTS dài hơn thì phần dư sẽ đứng hình (giữ khung cuối).
    for (const s of active) {
      const freeze = (s.audio_duration ?? 0) + 0.6 - config.videoMaxSec
      if (s.audio_mode === 'tts' && freeze > 1) {
        next.push(`⚠ ${s.id}: thoại ${s.audio_duration.toFixed(1)}s > clip tối đa ${config.videoMaxSec}s → đứng hình ~${freeze.toFixed(1)}s. Nên tách thành 2 cảnh (đổi góc máy) bằng episode_script_save.`)
      }
    }
    if (noAudio.length) next.push(`episode_audio_generate — thoại TTS còn thiếu: ${noAudio.join(', ')}`)
    if (noImage.length) next.push(`storyboard_generate — ảnh phân cảnh còn thiếu: ${noImage.join(', ')}`)
    else if (unapproved.length) next.push(`storyboard_review → storyboard_approve — chưa duyệt: ${unapproved.join(', ')}`)
    else if (noVideo.length) next.push(`episode_videos_generate — video còn thiếu: ${noVideo.join(', ')}`)
    const musicPrompt = ep.music?.prompt || project.music?.prompt
    if (musicPrompt && ep.music?.enabled !== false && !has(ep.music?.file)) next.push('music_generate — nhạc nền cho tập')
    if (!noVideo.length && !noAudio.length) next.push(has(ep.output?.video) ? 'Tập đã có phim hoàn chỉnh — sửa cảnh rồi episode_assemble lại nếu cần.' : 'episode_assemble — ghép thành phim hoàn chỉnh')
  }
  return {
    id: ep.id,
    number: ep.number,
    title: ep.title,
    synopsis: ep.synopsis,
    has_script: !!ep.script,
    duration,
    scenes,
    output: ep.output ? { ...ep.output, video_abs: abs(project.id, ep.output.video), srt_abs: abs(project.id, ep.output.srt) } : null,
    next_steps: next
  }
}

export function summarize(project, h) {
  const has = (p) => exists(project.id, p)
  const next = []
  if (!project.bible) next.push('series_bible_save — chủ đề, thế giới, tông, mạch truyện, dàn ý các tập (sau khi brainstorm với người dùng)')
  if (!project.characters.length) next.push('characters_save — nhân vật (ngoại hình, tính cách, phụ kiện, giọng) + bối cảnh lặp lại')
  const noSheet = referenceItems(project).filter((r) => !has(r.item.reference_image)).map((r) => r.id)
  if (project.characters.length && noSheet.length) next.push(`characters_generate — ảnh tham chiếu còn thiếu: ${noSheet.join(', ')}`)
  if (project.bible && !project.episodes.length) next.push('episode_script_save — kịch bản chi tiết tập 1')
  const episodes = project.episodes.map((ep) => {
    const s = summarizeEpisode(project, ep, h)
    const act = s.scenes.filter((x) => !x.skip)
    return {
      id: ep.id,
      number: ep.number,
      title: ep.title,
      scenes: act.length,
      duration: `${s.duration.estimated} / mục tiêu ${s.duration.target}`,
      storyboard: `${act.filter((x) => x.image).length}/${act.length} ảnh, ${act.filter((x) => x.approved).length} đã duyệt`,
      videos: `${act.filter((x) => x.video).length}/${act.length}`,
      final: s.output?.video_abs || null,
      next: s.next_steps[0]
    }
  })
  if (!noSheet.length) for (const e of episodes) if (!e.final && e.next) next.push(`${e.id}: ${e.next}`)
  return {
    id: project.id,
    title: project.title,
    dir: projectDir(project.id),
    aspect_ratio: project.aspect_ratio,
    style: project.style,
    audio_mode: project.audio_mode,
    episode_duration: fmtMin(project.episode_duration_sec || EPISODE_DEFAULT_SEC),
    bible: project.bible ? Object.keys(project.bible).filter((k) => project.bible[k]) : null,
    characters: project.characters.map((c) => ({
      id: c.id,
      name: c.name,
      role: c.role,
      voice: c.voice,
      sheet: has(c.reference_image),
      ...(c.looks?.length ? { looks: c.looks.map((l) => ({ id: l.id, name: l.name, sheet: has(l.reference_image) })) } : {})
    })),
    locations: (project.locations || []).map((l) => ({ id: l.id, name: l.name, reference: has(l.reference_image) })),
    episodes,
    next_steps: next.length ? next : ['Mọi tập đã hoàn chỉnh.']
  }
}
