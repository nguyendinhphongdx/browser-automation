import fs from 'node:fs'
import path from 'node:path'
import { config, RESOLUTIONS } from './config.js'
import * as gemini from './gemini.js'
import * as media from './media.js'
import {
  abs, ensureDir, episodeDir, exists, findCharacter, findEpisode, findLocation, findScene, loadProject, projectDir, rel, sceneDir, scenesOf, updateProject
} from './project.js'

export const NARRATOR = 'narrator'

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i], i)
    }
  })
  await Promise.all(workers)
  return results
}

function pickScenes(episode, sceneIds) {
  return sceneIds?.length ? sceneIds.map((id) => findScene(episode, id)) : scenesOf(episode)
}

/**
 * Chọn nguồn âm thanh tốt hơn cho từng cảnh khi audio_mode = auto:
 * - Mọi người nói đều ĐANG Ở TRONG KHUNG HÌNH → native: model video tự nói, khẩu hình khớp.
 * - Có lời dẫn / người nói ngoài khung hình → tts: dựng thoại theo mốc thời gian rồi đọc bằng TTS.
 * - Cảnh không lời → native (âm thanh môi trường của clip).
 */
export function effectiveAudioMode(project, scene) {
  const mode = scene.audio_mode || project.audio_mode || 'auto'
  if (mode !== 'auto') return mode
  if (!scene.lines?.length) return 'native'
  const inFrame = new Set((scene.characters || []).map((c) => findCharacter(project, c)?.id).filter(Boolean))
  return scene.lines.every((l) => inFrame.has(findCharacter(project, l.speaker)?.id)) ? 'native' : 'tts'
}

/** Chạy 1 việc cho từng cảnh; lỗi của cảnh nào ghi vào cảnh đó, không làm hỏng các cảnh khác. */
async function eachScene(projectId, episodeId, scenes, kind, log, work) {
  const failed = []
  const done = []
  await mapLimit(scenes, config.concurrency, async (scene) => {
    try {
      log(`${kind} ${episodeId}/${scene.id}: bắt đầu`)
      const patch = await work(scene)
      await updateProject(projectId, (p) => {
        const s = findScene(findEpisode(p, episodeId), scene.id)
        const { approved, ...assets } = patch
        s.assets = { ...s.assets, ...assets }
        if (approved !== undefined) s.approved = approved
        if (s.errors) delete s.errors[kind]
      })
      done.push(scene.id)
      log(`${kind} ${episodeId}/${scene.id}: xong`)
    } catch (err) {
      failed.push({ scene: scene.id, error: err.message })
      log(`${kind} ${episodeId}/${scene.id}: LỖI — ${err.message}`)
      await updateProject(projectId, (p) => {
        const s = findScene(findEpisode(p, episodeId), scene.id)
        s.errors = { ...s.errors, [kind]: err.message }
      })
    }
  })
  return { done, failed }
}

/**
 * Nhân vật CÓ MẶT trong khung hình — quyết định ảnh tham chiếu + mô tả ngoại hình gửi model.
 * Người nói ngoài khung (TTS) không được tính, nếu không model sẽ vẽ họ vào cảnh.
 * Chỉ khi cảnh KHÔNG khai báo `characters` mới suy từ người nói (tương thích kịch bản cũ);
 * `characters: []` = chủ ý không có nhân vật nào trong khung (vd hồi tưởng có lời kể của vua).
 */
function charactersIn(project, scene) {
  const ids = Array.isArray(scene.characters) ? scene.characters : (scene.lines || []).map((l) => l.speaker)
  const chars = ids.map((id) => findCharacter(project, id)).filter(Boolean)
  return chars.filter((c, i) => chars.findIndex((x) => x.id === c.id) === i)
}

const accessoryText = (c) => (c.accessories?.length ? `; luôn có: ${c.accessories.map((a) => (a.description ? `${a.name} (${a.description})` : a.name)).join(', ')}` : '')

function castNote(project, scene, { acting = false } = {}) {
  const chars = charactersIn(project, scene)
  if (!chars.length) return ''
  return ` Nhân vật — ${chars
    .map((c) => `${c.name}: ${c.appearance}${accessoryText(c)}${acting && c.personality ? `; diễn xuất theo tính cách: ${c.personality}` : ''}`)
    .join(' | ')}.`
}

function locationNote(project, scene) {
  const loc = findLocation(project, scene.location)
  return loc ? ` Bối cảnh: ${loc.name} — ${loc.description}.` : ''
}

// ───────────────────────── Character sheet + bối cảnh ─────────────────────────

function characterSheetPrompt(project, c) {
  const props = c.accessories?.length
    ? ` Show every accessory clearly — worn/held by the character AND as separate isolated item callouts: ${c.accessories.map((a) => `${a.name}${a.description ? ` (${a.description})` : ''}`).join('; ')}.`
    : ' The character carries NO weapons, bags or props.'
  return (
    `Character design sheet for an animated/cinematic series. ${project.style ? `Visual style: ${project.style}. ` : ''}` +
    `Single image on a plain light-grey background: full-body turnaround (front, 3/4, side, back) plus a face close-up showing a typical expression.` +
    `${props} Character: ${c.name}${c.role ? ` (${c.role})` : ''} — ${c.appearance}.` +
    `${c.personality ? ` Pose and expression convey personality: ${c.personality}.` : ''} Consistent proportions and colors across all views. Do NOT invent any extra accessories, weapons or props beyond those listed. No text, no labels, no watermark.`
  )
}

export async function generateReferences(projectId, { ids, force } = {}, log) {
  const project = loadProject(projectId)
  const items = [
    ...project.characters.map((c) => ({ kind: 'character', item: c })),
    ...(project.locations || []).map((l) => ({ kind: 'location', item: l }))
  ].filter(({ item }) => !ids?.length || ids.includes(item.id))
  const failed = []
  const done = []
  await mapLimit(items, config.concurrency, async ({ kind, item }) => {
    if (!force && exists(projectId, item.reference_image)) return
    try {
      log(`${kind} ${item.id}: sinh ảnh tham chiếu`)
      const dir = ensureDir(path.join(projectDir(projectId), kind === 'character' ? 'characters' : 'locations'))
      const prompt =
        kind === 'character'
          ? characterSheetPrompt(project, item)
          : `Environment concept art, establishing wide shot, no people. ${project.style ? `Visual style: ${project.style}. ` : ''}${item.name} — ${item.description}. No text, no watermark.`
      const file = await gemini.generateImage({
        prompt,
        aspectRatio: '16:9',
        outBase: path.join(dir, item.id),
        usage: { projectId, purpose: kind === 'character' ? 'character_sheet' : 'location_reference', target: item.id }
      })
      await updateProject(projectId, (p) => {
        const list = kind === 'character' ? p.characters : p.locations
        list.find((x) => x.id === item.id).reference_image = rel(projectId, file)
      })
      done.push(item.id)
    } catch (err) {
      failed.push({ id: item.id, error: err.message })
      log(`${kind} ${item.id}: LỖI — ${err.message}`)
    }
  })
  return { done, failed }
}

// ───────────────────────── Thoại TTS ─────────────────────────

export async function generateEpisodeAudio(projectId, episodeId, { sceneIds, force } = {}, log) {
  const project = loadProject(projectId)
  const ep = findEpisode(project, episodeId)
  const scenes = pickScenes(ep, sceneIds).filter(
    (s) => effectiveAudioMode(project, s) === 'tts' && s.lines?.length && (force || !exists(projectId, s.assets?.audio))
  )
  return eachScene(projectId, episodeId, scenes, 'audio', log, async (scene) => {
    const dir = sceneDir(projectId, episodeId, scene.id)
    const lines = await mapLimit(scene.lines, 2, async (line, i) => {
      const char = line.speaker === NARRATOR ? null : findCharacter(project, line.speaker)
      if (line.speaker !== NARRATOR && !char) throw new Error(`câu ${i + 1}: speaker "${line.speaker}" không phải nhân vật nào`)
      const file = path.join(dir, `line-${String(i + 1).padStart(2, '0')}.wav`)
      await gemini.generateSpeech({
        text: line.text,
        voice: char ? char.voice : project.narrator_voice,
        style: line.style,
        language: project.language,
        outFile: file,
        usage: { projectId, purpose: 'line_tts', episode: episodeId, scene: scene.id, target: `line-${i + 1}` }
      })
      return { file, speaker: line.speaker, text: line.text, pause_before: line.pause_before }
    })
    const out = path.join(dir, 'audio.wav')
    const { duration, timeline } = await media.layoutLines({ lines, outFile: out })
    return {
      audio: rel(projectId, out),
      audio_duration: Number(duration.toFixed(3)),
      timeline: timeline.map((l) => ({ speaker: l.speaker, text: l.text, start: Number(l.start.toFixed(3)), end: Number(l.end.toFixed(3)) }))
    }
  })
}

// ───────────────────────── Storyboard (ảnh phân cảnh) ─────────────────────────

export function buildImagePrompt(project, scene) {
  return (
    `${project.style ? `Visual style: ${project.style}. ` : ''}Cinematic film still, aspect ${project.aspect_ratio}. ` +
    `${scene.image_prompt}.${locationNote(project, scene)}${castNote(project, scene)} ` +
    `Characters, accessories and location must match the reference images exactly; no extra props. No text, no captions, no watermark.`
  )
}

export async function generateStoryboard(projectId, episodeId, { sceneIds, force } = {}, log) {
  const project = loadProject(projectId)
  const ep = findEpisode(project, episodeId)
  const scenes = pickScenes(ep, sceneIds).filter((s) => force || !exists(projectId, s.assets?.image))
  return eachScene(projectId, episodeId, scenes, 'image', log, async (scene) => {
    const loc = findLocation(project, scene.location)
    const refs = [
      ...charactersIn(project, scene).filter((c) => exists(projectId, c.reference_image)).slice(0, 3).map((c) => abs(projectId, c.reference_image)),
      ...(loc && exists(projectId, loc.reference_image) ? [abs(projectId, loc.reference_image)] : [])
    ]
    const file = await gemini.generateImage({
      prompt: buildImagePrompt(project, scene),
      aspectRatio: project.aspect_ratio,
      references: refs,
      outBase: path.join(sceneDir(projectId, episodeId, scene.id), 'image'),
      usage: { projectId, purpose: 'storyboard', episode: episodeId, scene: scene.id }
    })
    // Ảnh mới → phải duyệt lại, và video cũ (dựng từ ảnh cũ) bỏ.
    return { image: rel(projectId, file), video: null, video_duration: null, approved: false }
  })
}

/** Ảnh thu nhỏ để agent/người dùng duyệt storyboard ngay trong cuộc trò chuyện. */
export async function storyboardPreviews(projectId, episodeId, sceneIds) {
  const project = loadProject(projectId)
  const ep = findEpisode(project, episodeId)
  const out = []
  for (const s of pickScenes(ep, sceneIds)) {
    const item = { scene: s.id, title: s.title, approved: !!s.approved, image: abs(projectId, s.assets?.image), lines: s.lines?.map((l) => `${l.speaker}: ${l.text}`) }
    if (exists(projectId, s.assets?.image)) {
      const preview = path.join(sceneDir(projectId, episodeId, s.id), 'preview.jpg')
      await media.resizeImage(item.image, 480, preview)
      item.preview = preview
    }
    out.push(item)
  }
  return out
}

// ───────────────────────── Video từ ảnh ─────────────────────────

/** Thời lượng clip cần sinh: tts → phủ hết thoại; native → theo duration_sec (hoặc ước theo độ dài lời thoại). */
export function targetVideoSec(project, scene) {
  let want
  if (effectiveAudioMode(project, scene) === 'tts' && scene.assets?.audio_duration) want = scene.assets.audio_duration + 0.6
  else if (scene.duration_sec) want = scene.duration_sec
  else {
    const chars = (scene.lines || []).reduce((n, l) => n + l.text.length, 0)
    want = Math.max(6, chars / 14 + 1.5) // ~14 ký tự/giây khi nói tự nhiên
  }
  return Math.min(config.videoMaxSec, Math.max(config.videoMinSec, Math.ceil(want)))
}

/** Tốc độ đọc tiếng Việt đo từ TTS thật (~12 ký tự/giây, gồm ngắt nghỉ ở dấu câu). */
const CHARS_PER_SEC = 12

function estimateSpeechSec(lines) {
  const chars = lines.reduce((n, l) => n + l.text.length, 0)
  const pauses = lines.reduce((n, l) => n + (l.pause_before || 0), 0)
  return 0.3 + chars / CHARS_PER_SEC + 0.35 * Math.max(0, lines.length - 1) + pauses + 0.5
}

/** Độ dài 1 cảnh trên phim: TTS → độ dài thoại (thật nếu đã sinh, không thì ước tính); native → độ dài clip. */
export function estimateSceneSec(project, scene) {
  if (effectiveAudioMode(project, scene) === 'tts' && scene.lines?.length) return scene.assets?.audio_duration ?? estimateSpeechSec(scene.lines)
  return scene.assets?.video_duration ?? scene.duration_sec ?? targetVideoSec(project, scene)
}

/** Ước tính độ dài cả tập — để so với độ dài mục tiêu TRƯỚC khi tốn tiền sinh video. */
export function estimateEpisodeDuration(project, ep) {
  const scenes = scenesOf(ep)
  // Cảnh TTS được kéo dài đúng bằng phần chồng của chuyển cảnh nên không mất thời lượng; cảnh native thì mất.
  const overlap = scenes.slice(1).reduce((n, s) => {
    const t = s.transition || { type: 'fade', duration: 0.6 }
    return n + (t.type === 'cut' || effectiveAudioMode(project, s) === 'tts' ? 0 : (t.duration ?? 0.6))
  }, 0)
  return scenes.reduce((n, s) => n + estimateSceneSec(project, s), 0) - overlap
}

export function buildVideoPrompt(project, scene) {
  const native = effectiveAudioMode(project, scene) === 'native'
  const lang = project.language === 'vi' ? 'tiếng Việt' : project.language
  let audio
  if (native && scene.lines?.length) {
    audio =
      ' Lời thoại (nói rõ ràng, khẩu hình khớp, đúng thứ tự): ' +
      scene.lines
        .map((l) => {
          const c = findCharacter(project, l.speaker)
          return `${c ? c.name : 'Người dẫn chuyện (giọng ngoài khung hình)'} nói bằng ${lang}${l.style ? ` (${l.style})` : ''}: "${l.text}"`
        })
        .join(' Sau đó ') +
      ' Kèm âm thanh môi trường phù hợp, không nhạc nền.'
  } else if (native) audio = ' Âm thanh môi trường/hiệu ứng chân thực, không giọng nói, không nhạc nền.'
  else audio = ' Nhân vật có thể mấp máy môi nhưng KHÔNG có giọng nói; chỉ âm thanh môi trường, không nhạc nền.'
  return (
    `${project.style ? `Visual style: ${project.style}. ` : ''}${scene.video_prompt || scene.image_prompt}.` +
    `${locationNote(project, scene)}${castNote(project, scene, { acting: true })}${audio} Không chữ, không phụ đề, không watermark.`
  )
}

export async function generateEpisodeVideos(projectId, episodeId, { sceneIds, force, requireApproval = true } = {}, log) {
  const project = loadProject(projectId)
  const ep = findEpisode(project, episodeId)
  const all = scenesOf(ep)
  // Quy trình: đủ storyboard của CẢ TẬP (và đã duyệt) rồi mới sinh video — tránh tốn tiền video cho ảnh hỏng.
  const noImage = all.filter((s) => !exists(projectId, s.assets?.image)).map((s) => s.id)
  if (noImage.length) throw new Error(`Tập ${episodeId} chưa đủ storyboard — thiếu ảnh: ${noImage.join(', ')}. Chạy storyboard_generate trước.`)
  const scenes = pickScenes(ep, sceneIds).filter((s) => force || !exists(projectId, s.assets?.video))
  const unapproved = scenes.filter((s) => !s.approved).map((s) => s.id)
  if (requireApproval && unapproved.length) {
    throw new Error(`Storyboard chưa duyệt: ${unapproved.join(', ')}. Xem bằng storyboard_review rồi storyboard_approve (hoặc require_approval=false).`)
  }
  const blocked = []
  const ready = scenes.filter((s) => {
    if (effectiveAudioMode(project, s) === 'tts' && s.lines?.length && !exists(projectId, s.assets?.audio)) {
      blocked.push({ scene: s.id, error: 'cảnh dùng TTS nhưng chưa có thoại — chạy episode_audio_generate trước (độ dài video theo độ dài thoại)' })
      return false
    }
    return true
  })
  const result = await eachScene(projectId, episodeId, ready, 'video', log, async (scene) => {
    const out = path.join(sceneDir(projectId, episodeId, scene.id), 'video.mp4')
    await gemini.generateVideo({
      prompt: buildVideoPrompt(project, scene),
      image: abs(projectId, scene.assets.image),
      aspectRatio: project.aspect_ratio,
      resolution: project.resolution,
      durationSec: targetVideoSec(project, scene),
      outFile: out,
      usage: { projectId, purpose: 'scene_video', episode: episodeId, scene: scene.id }
    })
    const { duration } = await media.probe(out)
    return { video: rel(projectId, out), video_duration: Number(duration.toFixed(3)), video_audio_mode: effectiveAudioMode(project, scene) }
  })
  return { ...result, failed: [...blocked, ...result.failed] }
}

// ───────────────────────── Nhạc nền ─────────────────────────

export async function generateMusic(projectId, episodeId, { prompt, force } = {}, log) {
  const project = loadProject(projectId)
  const ep = findEpisode(project, episodeId)
  const musicPrompt = prompt || ep.music?.prompt || project.music?.prompt
  if (!musicPrompt) throw new Error('Chưa có mô tả nhạc nền — truyền `prompt`, hoặc đặt music trong series_bible_save / episode_script_save')
  if (!force && !prompt && exists(projectId, ep.music?.file)) return { skipped: 'tập đã có nhạc nền' }
  log(`nhạc nền ${episodeId}: đang sinh`)
  const out = path.join(ensureDir(path.join(episodeDir(projectId, episodeId), 'music')), 'music.wav')
  await gemini.generateMusic({ prompt: `Instrumental film score, no vocals. ${musicPrompt}`, outFile: out, usage: { projectId, purpose: 'music', episode: episodeId } })
  await updateProject(projectId, (p) => {
    const e = findEpisode(p, episodeId)
    e.music = { ...e.music, prompt: musicPrompt, file: rel(projectId, out) }
  })
  return { file: out }
}

// ───────────────────────── Ghép tập ─────────────────────────

function wrapSubtitle(text, max = 42) {
  if (text.length <= max) return text
  const lines = ['']
  for (const w of text.split(/\s+/)) {
    const cur = lines.at(-1)
    if ((cur + ' ' + w).trim().length > max && cur) lines.push(w)
    else lines[lines.length - 1] = (cur + ' ' + w).trim()
  }
  return lines.join('\n')
}

/** Cảnh native không có mốc thoại thật → ước lượng theo độ dài chữ trên thời lượng clip (đủ tốt cho phụ đề). */
function estimateTimeline(lines, duration) {
  const start = 0.4
  const span = Math.max(1, duration - start - 0.4)
  const total = lines.reduce((n, l) => n + l.text.length, 0) || 1
  let t = start
  return lines.map((l) => {
    const d = (l.text.length / total) * span
    const cue = { text: l.text, start: t, end: t + d - 0.1 }
    t += d
    return cue
  })
}

export async function assembleEpisode(projectId, episodeId, opts = {}, log = () => {}) {
  const project = loadProject(projectId)
  const ep = findEpisode(project, episodeId)
  const [width, height] = RESOLUTIONS[project.resolution]?.[project.aspect_ratio] || RESOLUTIONS['720p']['16:9']
  const scenes = scenesOf(ep)
  if (!scenes.length) throw new Error(`Tập ${episodeId} chưa có cảnh nào`)

  const missing = scenes.filter((s) => !exists(projectId, s.assets?.video) && !exists(projectId, s.assets?.image))
  if (missing.length) throw new Error(`Các cảnh chưa có cả video lẫn ảnh: ${missing.map((s) => s.id).join(', ')}`)
  const noVideo = scenes.filter((s) => !exists(projectId, s.assets?.video)).map((s) => s.id)
  if (noVideo.length && !opts.allowStills) {
    throw new Error(`Các cảnh chưa có video: ${noVideo.join(', ')}. Sinh video trước, hoặc episode_assemble với allow_stills=true để xem nháp bằng ảnh tĩnh (Ken Burns).`)
  }

  const outDir = ensureDir(path.join(episodeDir(projectId, episodeId), 'output'))
  const transitionOf = (i) => scenes[i].transition || { type: opts.defaultTransition || 'fade', duration: 0.6 }
  const transitionDur = (i) => {
    if (i <= 0 || i >= scenes.length) return 0
    const t = transitionOf(i)
    return t.type === 'cut' ? 0 : (t.duration ?? 0.6)
  }

  // 1) Chuẩn hoá từng cảnh thành segment cùng định dạng, đủ dài để chuyển cảnh không nuốt thoại.
  const segments = []
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i]
    const hasVideo = exists(projectId, s.assets?.video)
    const tts = effectiveAudioMode(project, s) === 'tts' && exists(projectId, s.assets?.audio)
    const dIn = transitionDur(i)
    const dOut = transitionDur(i + 1)
    let length
    if (tts) length = dIn + s.assets.audio_duration + dOut
    else if (hasVideo) length = s.assets.video_duration || (await media.probe(abs(projectId, s.assets.video))).duration
    else length = s.duration_sec || targetVideoSec(project, s)
    length = Math.max(length, dIn + dOut + 1)

    // Video sinh ở chế độ native mà giờ cảnh dùng tts (hoặc ngược lại) → tiếng gốc chứa giọng nói lệch; giảm hẳn.
    const nativeVoice = s.assets?.video_audio_mode === 'native' && s.lines?.length
    const nativeVolume = s.native_volume ?? (tts ? (nativeVoice ? 0 : (opts.ambienceVolume ?? 0.25)) : 1)

    log(`dựng segment ${s.id} (${length.toFixed(1)}s, âm thanh: ${tts ? 'tts' : 'video'})`)
    const file = path.join(sceneDir(projectId, episodeId, s.id), 'segment.mp4')
    await media.buildSegment({
      video: hasVideo ? abs(projectId, s.assets.video) : null,
      image: abs(projectId, s.assets?.image),
      audio: tts ? abs(projectId, s.assets.audio) : null,
      audioOffset: tts ? dIn : 0,
      nativeVolume,
      length,
      width,
      height,
      outFile: file
    })
    const timeline = tts ? s.assets.timeline || [] : hasVideo && s.lines?.length ? estimateTimeline(s.lines, length) : []
    segments.push({ file, length, transition: i ? { type: transitionOf(i).type, duration: dIn } : null, timeline, offset: tts ? dIn : 0 })
  }

  // 2) Nối theo thứ tự với chuyển cảnh.
  log('nối các cảnh + chuyển cảnh')
  const name = opts.outputName || 'final'
  const joined = path.join(outDir, 'joined.mp4')
  const { duration, starts } = await media.joinSegments({ segments, outFile: joined })

  // 3) Phụ đề theo mốc thời gian của từng câu.
  const cues = segments.flatMap((seg, i) =>
    seg.timeline.map((l) => ({ start: starts[i] + seg.offset + l.start, end: Math.min(starts[i] + seg.length, starts[i] + seg.offset + l.end), text: l.text }))
  )
  const srt = path.join(outDir, `${name}.srt`)
  fs.writeFileSync(srt, cues.map((c, i) => `${i + 1}\n${media.srtTime(c.start)} --> ${media.srtTime(c.end)}\n${wrapSubtitle(c.text)}\n`).join('\n'))

  // 4) Nhạc nền + loudness + fade + phụ đề → file đăng được ngay.
  log('mix nhạc nền, chuẩn hoá âm lượng, xuất file cuối')
  const final = path.join(outDir, `${name}.mp4`)
  const useMusic = opts.music !== false && ep.music?.enabled !== false && exists(projectId, ep.music?.file)
  const { burnedSubtitles } = await media.finalize({
    joined,
    duration,
    music: useMusic ? abs(projectId, ep.music.file) : null,
    musicVolume: opts.musicVolume ?? ep.music?.volume ?? project.music?.volume ?? 0.25,
    srt: cues.length && opts.subtitles !== false ? srt : null,
    burnSubtitles: opts.burnSubtitles,
    language: project.language,
    outFile: final
  })
  fs.rmSync(joined, { force: true })
  const cover = await media.thumbnail(final, Math.min(duration / 3, 5), path.join(outDir, 'cover.jpg'))

  const output = {
    video: rel(projectId, final),
    srt: cues.length ? rel(projectId, srt) : null,
    cover: rel(projectId, cover),
    duration_sec: Number(duration.toFixed(2)),
    target_duration_sec: ep.target_duration_sec ?? null,
    size: `${width}x${height}`,
    music: useMusic,
    subtitles: cues.length ? (burnedSubtitles ? 'burned-in' : 'soft-track + .srt') : 'none',
    stills_used: noVideo,
    // Mốc từng cảnh trên phim cuối — publish kit dựng chapter từ đây.
    scene_starts: scenes.map((s, i) => ({ id: s.id, start: Number(starts[i].toFixed(2)) })),
    assembled_at: new Date().toISOString()
  }
  await updateProject(projectId, (p) => {
    findEpisode(p, episodeId).output = output
  })
  return { ...output, video_abs: final, srt_abs: cues.length ? srt : null, cover_abs: cover }
}

// ───────────────────────── Chạy cả quy trình 1 tập ─────────────────────────

export const STEPS = ['references', 'audio', 'storyboard', 'videos', 'music', 'assemble']

export async function runEpisode(projectId, episodeId, { steps = STEPS, force = false, requireApproval = true, assembleOptions = {} } = {}, log) {
  const report = {}
  for (const step of STEPS.filter((s) => steps.includes(s))) {
    log(`══ ${episodeId}: ${step}`)
    if (step === 'references') report.references = await generateReferences(projectId, { force }, log)
    if (step === 'audio') report.audio = await generateEpisodeAudio(projectId, episodeId, { force }, log)
    if (step === 'storyboard') report.storyboard = await generateStoryboard(projectId, episodeId, { force }, log)
    if (step === 'videos') report.videos = await generateEpisodeVideos(projectId, episodeId, { force, requireApproval }, log)
    if (step === 'music') {
      const p = loadProject(projectId)
      const ep = findEpisode(p, episodeId)
      if ((ep.music?.prompt || p.music?.prompt) && ep.music?.enabled !== false) report.music = await generateMusic(projectId, episodeId, { force }, log)
    }
    if (step === 'assemble') {
      const failedVideos = report.videos?.failed?.length
      if (failedVideos && !assembleOptions.allowStills) {
        report.assemble = { skipped: `${failedVideos} cảnh sinh video lỗi — sửa rồi chạy lại, hoặc episode_assemble với allow_stills=true` }
      } else report.assemble = await assembleEpisode(projectId, episodeId, assembleOptions, log)
    }
  }
  return report
}
