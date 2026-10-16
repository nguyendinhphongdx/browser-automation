#!/usr/bin/env node
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from '../config.js'
import { listJobs } from '../jobs.js'
import * as pipeline from '../pipeline.js'
import { findEpisode, listProjects, loadProject, projectDir, summarize, summarizeEpisode } from '../project.js'
import { usageReport, USAGE_GROUPS } from '../usage.js'

/**
 * Dashboard chỉ-đọc: xem dự án / tập / storyboard / video / quota / job.
 * Chạy chung tiến trình với MCP server để thấy job đang chạy (job chỉ sống trong bộ nhớ);
 * chạy riêng (`node src/dashboard/http.js`) vẫn xem được mọi thứ trừ job.
 * Chỉ lắng nghe 127.0.0.1 — máy khác không truy cập được.
 */

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public')
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.srt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
}

/** URL file trong dự án, kèm mtime để trình duyệt tải lại khi asset được sinh lại. */
function fileUrl(projectId, relPath) {
  if (!relPath) return null
  try {
    const { mtimeMs } = fs.statSync(path.join(projectDir(projectId), relPath))
    return `/files/${projectId}/${relPath.split(path.sep).map(encodeURIComponent).join('/')}?v=${Math.round(mtimeMs)}`
  } catch {
    return null
  }
}

function previewOf(projectId, imageRel) {
  if (!imageRel) return null
  return fileUrl(projectId, path.join(path.dirname(imageRel), 'preview.jpg')) || fileUrl(projectId, imageRel)
}

function projectView(id) {
  const p = loadProject(id)
  const status = summarize(p, pipeline)
  const ref = (x) => ({ ...x, image: fileUrl(id, x.reference_image) })
  return {
    ...status,
    logline: p.logline,
    bible: p.bible,
    narrator_voice: p.narrator_voice,
    characters: p.characters.map(ref),
    locations: (p.locations || []).map(ref),
    episodes: status.episodes.map((e) => {
      const ep = findEpisode(p, e.id)
      const cover = ep.output?.cover ? fileUrl(id, ep.output.cover) : previewOf(id, ep.scenes.find((s) => s.assets?.image)?.assets.image)
      return { ...e, synopsis: ep.synopsis, cover }
    }),
    usage: usageReport(id).total
  }
}

function episodeView(id, epId) {
  const p = loadProject(id)
  const ep = findEpisode(p, epId)
  const status = summarizeEpisode(p, ep, pipeline)
  const byId = Object.fromEntries(status.scenes.map((s) => [s.id, s]))
  return {
    project: { id: p.id, title: p.title, aspect_ratio: p.aspect_ratio },
    ...status,
    script: ep.script,
    output: ep.output
      ? { ...ep.output, video: fileUrl(id, ep.output.video), srt: fileUrl(id, ep.output.srt), cover: fileUrl(id, ep.output.cover) }
      : null,
    music: ep.music ? { prompt: ep.music.prompt, file: fileUrl(id, ep.music.file) } : null,
    scenes: ep.scenes.map((s) => ({
      ...byId[s.id],
      description: s.description,
      location: s.location,
      characters: s.characters,
      lines: s.lines,
      transition: s.transition,
      image_prompt: s.image_prompt,
      video_prompt: s.video_prompt,
      est_sec: Number(pipeline.estimateSceneSec(p, s).toFixed(1)),
      thumb: previewOf(id, s.assets?.image),
      image: fileUrl(id, s.assets?.image),
      video: fileUrl(id, s.assets?.video),
      audio: fileUrl(id, s.assets?.audio),
      video_duration: s.assets?.video_duration ?? null
    }))
  }
}

function send(res, code, body, type = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' })
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body))
}

/** Phát file có hỗ trợ Range — cần để tua video/âm thanh trong trình duyệt. */
function sendFile(req, res, file) {
  let stat
  try {
    stat = fs.statSync(file)
  } catch {
    return send(res, 404, { error: 'not found' })
  }
  const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream'
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '')
  if (range) {
    const start = range[1] ? Number(range[1]) : 0
    const end = range[2] ? Math.min(Number(range[2]), stat.size - 1) : stat.size - 1
    if (start >= stat.size || start > end) {
      res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` })
      return res.end()
    }
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 })
    return fs.createReadStream(file, { start, end }).pipe(res)
  }
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'max-age=31536000' })
  fs.createReadStream(file).pipe(res)
}

export function handle(req, res) {
  const url = new URL(req.url, 'http://localhost')
  const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent)
  try {
    if (!parts.length) return sendFile(req, res, path.join(PUBLIC, 'index.html'))

    if (parts[0] === 'files' && parts.length >= 3) {
      const root = projectDir(parts[1])
      const file = path.resolve(root, ...parts.slice(2))
      if (!file.startsWith(root + path.sep)) return send(res, 403, { error: 'forbidden' })
      return sendFile(req, res, file)
    }

    if (parts[0] !== 'api') return send(res, 404, { error: 'not found' })
    const [, resource, id, sub, epId] = parts
    if (resource === 'projects' && !id) {
      return send(
        res,
        200,
        listProjects().map((p) => ({ id: p.id, title: p.title, logline: p.logline, aspect_ratio: p.aspect_ratio, episodes: p.episodes.length, updated_at: p.updated_at }))
      )
    }
    if (resource === 'projects' && id && !sub) return send(res, 200, projectView(id))
    if (resource === 'projects' && sub === 'episodes' && epId) return send(res, 200, episodeView(id, epId))
    if (resource === 'projects' && sub === 'usage') {
      const groupBy = USAGE_GROUPS.includes(url.searchParams.get('group')) ? url.searchParams.get('group') : 'kind'
      return send(res, 200, usageReport(id, { episodeId: url.searchParams.get('episode') || undefined, groupBy, entries: 30 }))
    }
    if (resource === 'jobs') return send(res, 200, { live: !standalone, jobs: listJobs(url.searchParams.get('project') || undefined) })
    return send(res, 404, { error: 'not found' })
  } catch (err) {
    return send(res, /Không (tìm thấy|có)/.test(err.message) ? 404 : 500, { error: err.message })
  }
}

let standalone = false

export function startDashboard(port = config.dashboardPort) {
  if (!port) return null
  const server = http.createServer(handle)
  server.on('error', (err) => console.error(`[film-studio] dashboard không mở được cổng ${port}: ${err.message}`))
  server.listen(port, '127.0.0.1', () => console.error(`[film-studio] dashboard: http://localhost:${port}`))
  return server
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  standalone = true
  startDashboard(config.dashboardPort || 4747)
}
