import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { config } from './config.js'

/** Các kiểu chuyển cảnh hợp lệ (tên filter xfade của ffmpeg) + "cut" = cắt thẳng. */
export const TRANSITIONS = [
  'cut', 'fade', 'fadeblack', 'fadewhite', 'dissolve', 'wipeleft', 'wiperight', 'wipeup', 'wipedown',
  'slideleft', 'slideright', 'slideup', 'slidedown', 'smoothleft', 'smoothright', 'circleopen',
  'circleclose', 'radial', 'pixelize', 'zoomin', 'distance', 'hblur'
]

function run(bin, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    let err = ''
    proc.stdout.on('data', (d) => (out += d))
    proc.stderr.on('data', (d) => (err = (err + d).slice(-6000)))
    proc.on('error', (e) => reject(new Error(`Không chạy được ${bin}: ${e.message} (cài ffmpeg hoặc đặt FFMPEG_PATH/FFPROBE_PATH)`)))
    proc.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(`${path.basename(bin)} lỗi (exit ${code}):\n${err.trim().split('\n').slice(-12).join('\n')}`))))
  })
}

const ffmpeg = (args) => run(config.ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args])

export async function probe(file) {
  const out = await run(config.ffprobe, ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type', '-of', 'json', file])
  const json = JSON.parse(out)
  return {
    duration: Number(json.format?.duration || 0),
    hasAudio: (json.streams || []).some((s) => s.codec_type === 'audio'),
    hasVideo: (json.streams || []).some((s) => s.codec_type === 'video')
  }
}

let filterCache = null
export async function hasFilter(name) {
  filterCache ??= await run(config.ffmpeg, ['-hide_banner', '-filters']).catch(() => '')
  return new RegExp(`\\s${name}\\s`).test(filterCache)
}

function tmpFile(ext) {
  return path.join(os.tmpdir(), `film-studio-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`)
}

export async function pcmToWav(buf, outFile, rate, channels) {
  const raw = tmpFile('pcm')
  fs.writeFileSync(raw, buf)
  try {
    await ffmpeg(['-f', 's16le', '-ar', String(rate), '-ac', String(channels), '-i', raw, '-ar', '48000', '-ac', '2', outFile])
  } finally {
    fs.rmSync(raw, { force: true })
  }
}

export async function transcodeAudio(buf, outFile) {
  const src = tmpFile('bin')
  fs.writeFileSync(src, buf)
  try {
    await ffmpeg(['-i', src, '-ar', '48000', '-ac', '2', outFile])
  } finally {
    fs.rmSync(src, { force: true })
  }
}

/**
 * Ghép các câu thoại của 1 cảnh thành 1 track, đặt từng câu đúng thời điểm
 * (lead-in + khoảng nghỉ giữa các câu). Trả về độ dài track và mốc từng câu
 * — dùng để khớp độ dài video và sinh phụ đề.
 */
export async function layoutLines({ lines, leadIn = 0.3, gap = 0.35, tail = 0.5, outFile }) {
  const timeline = []
  let t = leadIn
  for (const line of lines) {
    const { duration } = await probe(line.file)
    t += line.pause_before ?? 0
    timeline.push({ ...line, start: t, end: t + duration })
    t += duration + gap
  }
  const total = (timeline.at(-1)?.end ?? leadIn) + tail
  const inputs = timeline.flatMap((l) => ['-i', l.file])
  const delays = timeline.map((l, i) => `[${i}:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=${Math.round(l.start * 1000)}:all=1[d${i}]`)
  const mix = `${timeline.map((_, i) => `[d${i}]`).join('')}amix=inputs=${timeline.length}:normalize=0:dropout_transition=0,apad,atrim=0:${total.toFixed(3)}[out]`
  await ffmpeg([...inputs, '-filter_complex', [...delays, mix].join(';'), '-map', '[out]', '-ar', '48000', '-ac', '2', outFile])
  return { duration: total, timeline }
}

const VIDEO_ENC = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(config.fps)]
const AUDIO_ENC = ['-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2']

/**
 * Chuẩn hoá 1 cảnh thành segment cùng độ phân giải/fps/codec, đúng `length` giây:
 * - Có video: scale+crop vừa khung, thiếu thời lượng thì giữ khung cuối (tpad), thừa thì cắt.
 * - Chưa có video nhưng có ảnh: hiệu ứng Ken Burns (zoom chậm) từ ảnh tĩnh.
 * - Âm thanh = lời thoại TTS (lùi `audioOffset` giây để chuyển cảnh vào không đè thoại)
 *   + tiếng gốc của video (âm lượng `nativeVolume`).
 */
export async function buildSegment({ video, image, audio, audioOffset = 0, nativeVolume, length, width, height, outFile }) {
  const L = length.toFixed(3)
  const args = []
  const filters = []
  const audioLabels = []
  let idx = 0

  if (video) {
    args.push('-i', video)
    filters.push(
      `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},fps=${config.fps},setsar=1,` +
        `tpad=stop_mode=clone:stop_duration=${L},trim=duration=${L},setpts=PTS-STARTPTS,format=yuv420p[v]`
    )
    if (nativeVolume > 0 && (await probe(video)).hasAudio) {
      filters.push(`[0:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=${nativeVolume}[na]`)
      audioLabels.push('[na]')
    }
    idx = 1
  } else if (image) {
    const frames = Math.ceil(length * config.fps)
    args.push('-loop', '1', '-framerate', String(config.fps), '-t', L, '-i', image)
    filters.push(
      `[0:v]scale=${width * 2}:${height * 2}:force_original_aspect_ratio=increase,crop=${width * 2}:${height * 2},` +
        `zoompan=z='min(1+0.12*on/${frames},1.12)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=${config.fps},` +
        `trim=duration=${L},setpts=PTS-STARTPTS,setsar=1,format=yuv420p[v]`
    )
    idx = 1
  } else {
    throw new Error('Segment cần ít nhất video hoặc ảnh')
  }

  if (audio) {
    args.push('-i', audio)
    filters.push(`[${idx}:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=${Math.round(audioOffset * 1000)}:all=1[ta]`)
    audioLabels.push('[ta]')
    idx++
  }
  if (!audioLabels.length) {
    args.push('-f', 'lavfi', '-t', L, '-i', 'anullsrc=r=48000:cl=stereo')
    audioLabels.push(`[${idx}:a]`)
  }
  const mixed = audioLabels.length > 1 ? `${audioLabels.join('')}amix=inputs=${audioLabels.length}:normalize=0:dropout_transition=0,` : `${audioLabels[0]}`
  filters.push(`${mixed}${audioLabels.length > 1 ? '' : 'anull,'}apad,atrim=0:${L},asetpts=PTS-STARTPTS[a]`)

  await ffmpeg([...args, '-filter_complex', filters.join(';'), '-map', '[v]', '-map', '[a]', ...VIDEO_ENC, ...AUDIO_ENC, '-t', L, outFile])
  return outFile
}

/**
 * Nối các segment theo thứ tự, chuyển cảnh bằng xfade (hình) + acrossfade (tiếng).
 * transition của segment i là chuyển cảnh TỪ segment i-1 SANG segment i.
 * Trả về mốc bắt đầu của từng segment trên timeline cuối (cho phụ đề).
 */
export async function joinSegments({ segments, outFile }) {
  if (segments.length === 1) {
    fs.copyFileSync(segments[0].file, outFile)
    return { duration: segments[0].length, starts: [0] }
  }
  const args = segments.flatMap((s) => ['-i', s.file])
  // Chuẩn hoá timebase mọi input — xfade từ chối nối khi timebase 2 đầu khác nhau (vd. sau 1 đoạn concat).
  const filters = segments.flatMap((_, i) => [
    `[${i}:v]fps=${config.fps},settb=AVTB,setpts=PTS-STARTPTS[in${i}v]`,
    `[${i}:a]asetpts=PTS-STARTPTS[in${i}a]`
  ])
  let v = '[in0v]'
  let a = '[in0a]'
  let acc = segments[0].length
  const starts = [0]

  for (let i = 1; i < segments.length; i++) {
    const { type = 'fade', duration = 0.6 } = segments[i].transition || {}
    // Không cho chuyển cảnh dài quá nửa đoạn ngắn hơn — tránh nuốt mất lời thoại.
    const d = Math.min(duration, segments[i - 1].length / 2, segments[i].length / 2)
    const vo = `[v${i}]`
    const ao = `[a${i}]`
    if (type === 'cut' || d < 0.05) {
      filters.push(`${v}${a}[in${i}v][in${i}a]concat=n=2:v=1:a=1[c${i}v]${ao}`, `[c${i}v]settb=AVTB${vo}`)
      starts.push(acc)
      acc += segments[i].length
    } else {
      const offset = acc - d
      filters.push(`${v}[in${i}v]xfade=transition=${type}:duration=${d.toFixed(3)}:offset=${offset.toFixed(3)}${vo}`)
      filters.push(`${a}[in${i}a]acrossfade=d=${d.toFixed(3)}:c1=tri:c2=tri${ao}`)
      starts.push(offset)
      acc = offset + segments[i].length
    }
    v = vo
    a = ao
  }

  await ffmpeg([...args, '-filter_complex', filters.join(';'), '-map', v, '-map', a, ...VIDEO_ENC, ...AUDIO_ENC, outFile])
  return { duration: acc, starts }
}

/**
 * Hoàn thiện: nhạc nền (lặp cho đủ dài, tự hạ âm lượng khi có thoại —
 * sidechain ducking, fade in/out), chuẩn hoá loudness -14 LUFS (chuẩn
 * YouTube/TikTok/Facebook), fade hình đầu/cuối, phụ đề (đốt cứng nếu
 * ffmpeg có libass, không thì nhúng track phụ đề mềm), +faststart để
 * phát được ngay khi đăng web.
 */
export async function finalize({ joined, duration, music, musicVolume = 0.25, srt, burnSubtitles, language, outFile }) {
  const D = duration.toFixed(3)
  const fadeOut = Math.max(0, duration - 1).toFixed(3)
  const args = ['-i', joined]
  const filters = []
  let vf = `[0:v]fade=t=in:st=0:d=0.6,fade=t=out:st=${fadeOut}:d=1`
  const burn = burnSubtitles && srt && (await hasFilter('subtitles'))
  if (burn) {
    const escaped = srt.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'")
    vf += `,subtitles='${escaped}':force_style='FontSize=18,Outline=2,Shadow=0,MarginV=40'`
  }
  filters.push(`${vf}[v]`)

  if (music) {
    args.push('-stream_loop', '-1', '-i', music)
    filters.push('[0:a]asplit=2[dia][sc]')
    filters.push(
      `[1:a]aformat=sample_rates=48000:channel_layouts=stereo,atrim=0:${D},volume=${musicVolume},` +
        `afade=t=in:st=0:d=1.5,afade=t=out:st=${Math.max(0, duration - 2.5).toFixed(3)}:d=2.5[bg]`
    )
    filters.push('[bg][sc]sidechaincompress=threshold=0.02:ratio=8:attack=20:release=400[ducked]')
    filters.push('[dia][ducked]amix=inputs=2:normalize=0:dropout_transition=0[mix]')
  } else {
    filters.push('[0:a]anull[mix]')
  }
  filters.push(`[mix]loudnorm=I=-14:TP=-1.5:LRA=11,aformat=sample_rates=48000:channel_layouts=stereo,afade=t=out:st=${fadeOut}:d=1[a]`)

  const softSubs = srt && !burn
  const subInputIndex = music ? 2 : 1
  if (softSubs) args.push('-i', srt)
  await ffmpeg([
    ...args,
    '-filter_complex', filters.join(';'),
    '-map', '[v]', '-map', '[a]',
    ...(softSubs ? ['-map', `${subInputIndex}:s`, '-c:s', 'mov_text', '-metadata:s:s:0', `language=${iso639_2(language)}`] : []),
    ...VIDEO_ENC, '-profile:v', 'high', ...AUDIO_ENC,
    '-t', D, '-movflags', '+faststart', outFile
  ])
  return { burnedSubtitles: !!burn }
}

export async function resizeImage(file, width, outFile) {
  await ffmpeg(['-i', file, '-vf', `scale=${width}:-2`, '-q:v', '4', outFile])
  return outFile
}

export async function thumbnail(video, atSec, outFile) {
  await ffmpeg(['-ss', atSec.toFixed(2), '-i', video, '-frames:v', '1', '-q:v', '2', outFile])
  return outFile
}

function iso639_2(lang) {
  return { vi: 'vie', en: 'eng', ja: 'jpn', ko: 'kor', zh: 'zho', fr: 'fra', es: 'spa' }[lang] || 'und'
}

export function srtTime(sec) {
  const ms = Math.max(0, Math.round(sec * 1000))
  const h = String(Math.floor(ms / 3600000)).padStart(2, '0')
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0')
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')
  return `${h}:${m}:${s},${String(ms % 1000).padStart(3, '0')}`
}
