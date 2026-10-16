import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { projectDir } from './project.js'

/**
 * Sổ quota: mỗi lần gọi API (kể cả lần lỗi) ghi 1 dòng JSON vào projects/<id>/usage.jsonl.
 * Append-only nên không cần khoá manifest, không mất khi job song song, và xem lại được
 * về sau (usage_report / cli usage). Chi phí chỉ ước tính khi có pricing.json — không tự đoán giá.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PRICING_FILE = process.env.FILM_PRICING_FILE || path.join(ROOT, 'pricing.json')

const usageFile = (projectId) => path.join(projectDir(projectId), 'usage.jsonl')

function tokens(usage) {
  if (!usage) return null
  return {
    input: usage.total_input_tokens ?? 0,
    output: usage.total_output_tokens ?? 0,
    thought: usage.total_thought_tokens ?? 0,
    total: usage.total_tokens ?? 0,
    output_by_modality: usage.output_tokens_by_modality
  }
}

/**
 * Bắt đầu theo dõi 1 lần sinh. `meta` = { projectId, episode, scene, target, purpose } — không có
 * projectId (vd. script test) thì không ghi gì.
 */
export function track(meta, { kind, model, request }) {
  const started = Date.now()
  let attempts = 0
  const write = (entry) => {
    if (!meta?.projectId) return
    const line = {
      ts: new Date().toISOString(),
      kind,
      purpose: meta.purpose,
      episode: meta.episode ?? null,
      scene: meta.scene ?? null,
      target: meta.target ?? null,
      model,
      attempts,
      latency_ms: Date.now() - started,
      request,
      ...entry
    }
    try {
      fs.appendFileSync(usageFile(meta.projectId), `${JSON.stringify(line)}\n`)
    } catch {
      // Sổ quota không được làm hỏng việc sinh asset.
    }
  }
  return {
    attempt: () => attempts++,
    ok: (res, output) => write({ status: 'ok', interaction_id: res?.id ?? null, tokens: tokens(res?.usage), output }),
    fail: (err) => write({ status: 'error', error: String(err?.message || err).slice(0, 300) })
  }
}

export function readUsage(projectId) {
  const file = usageFile(projectId)
  if (!fs.existsSync(file)) return []
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l)
      } catch {
        return null
      }
    })
    .filter(Boolean)
}

function loadPricing() {
  try {
    return JSON.parse(fs.readFileSync(PRICING_FILE, 'utf8'))
  } catch {
    return null
  }
}

/** Ước tính chi phí 1 lần gọi theo pricing.json; null nếu model chưa có giá. */
function costOf(e, pricing) {
  const p = pricing?.models?.[e.model]
  if (!p || e.status !== 'ok') return e.status === 'ok' ? null : 0
  const o = e.output || {}
  const t = e.tokens || {}
  return (
    (p.per_image ?? 0) * (o.images ?? 0) +
    (p.per_video_sec ?? 0) * (o.video_sec ?? 0) +
    (p.per_audio_sec ?? 0) * (o.audio_sec ?? 0) +
    ((p.per_1m_input_tokens ?? 0) * (t.input ?? 0) + (p.per_1m_output_tokens ?? 0) * ((t.output ?? 0) + (t.thought ?? 0))) / 1e6
  )
}

const round = (n, d = 2) => Number(n.toFixed(d))

function emptyTotals() {
  return { calls: 0, ok: 0, failed: 0, regenerated: 0, images: 0, video_sec: 0, audio_sec: 0, tts_chars: 0, input_tokens: 0, output_tokens: 0, total_tokens: 0, api_time_sec: 0, est_cost: 0, unpriced_calls: 0 }
}

function add(t, e, cost, regen) {
  t.calls++
  if (e.status === 'ok') t.ok++
  else t.failed++
  if (regen) t.regenerated++
  t.images += e.output?.images ?? 0
  t.video_sec += e.output?.video_sec ?? 0
  t.audio_sec += e.output?.audio_sec ?? 0
  t.tts_chars += e.output?.chars ?? 0
  t.input_tokens += e.tokens?.input ?? 0
  t.output_tokens += e.tokens?.output ?? 0
  t.total_tokens += e.tokens?.total ?? 0
  t.api_time_sec += (e.latency_ms ?? 0) / 1000
  if (cost == null) t.unpriced_calls++
  else t.est_cost += cost
}

function finish(t, pricing) {
  return {
    ...t,
    video_sec: round(t.video_sec, 1),
    audio_sec: round(t.audio_sec, 1),
    api_time_sec: round(t.api_time_sec, 1),
    est_cost: pricing ? round(t.est_cost, 4) : null
  }
}

const GROUPS = {
  kind: (e) => e.kind,
  model: (e) => e.model,
  purpose: (e) => e.purpose,
  episode: (e) => e.episode || '(dự án)',
  scene: (e) => (e.scene ? `${e.episode}/${e.scene}` : e.episode || '(dự án)'),
  day: (e) => e.ts.slice(0, 10)
}

/**
 * Tổng hợp quota: tổng + chia nhóm. "regenerated" = lần sinh thành công cho 1 thứ đã từng sinh
 * thành công trước đó (sinh lại) — phần quota "tốn thêm" do sửa/làm lại.
 */
export function usageReport(projectId, { episodeId, groupBy = 'kind', since, entries = 0 } = {}) {
  const pricing = loadPricing()
  const all = readUsage(projectId)
  const seen = new Set()
  const rows = []
  for (const e of all) {
    const key = [e.purpose, e.episode, e.scene, e.target].join('|')
    const regen = e.status === 'ok' && seen.has(key)
    if (e.status === 'ok') seen.add(key)
    if (episodeId && e.episode !== episodeId) continue
    if (since && e.ts < since) continue
    rows.push({ e, cost: costOf(e, pricing), regen })
  }
  const total = emptyTotals()
  const groups = {}
  const pick = GROUPS[groupBy] || GROUPS.kind
  for (const { e, cost, regen } of rows) {
    add(total, e, cost, regen)
    add((groups[pick(e)] ||= emptyTotals()), e, cost, regen)
  }
  const errors = rows.filter(({ e }) => e.status === 'error').slice(-10).map(({ e }) => ({ ts: e.ts, kind: e.kind, episode: e.episode, scene: e.scene, error: e.error }))
  return {
    project_id: projectId,
    scope: episodeId || 'toàn dự án',
    period: rows.length ? { from: rows[0].e.ts, to: rows.at(-1).e.ts } : null,
    pricing: pricing ? { file: PRICING_FILE, currency: pricing.currency || 'USD' } : `chưa có — copy pricing.example.json thành pricing.json và điền đơn giá để ước tính chi phí`,
    total: finish(total, pricing),
    group_by: groupBy,
    groups: Object.fromEntries(Object.entries(groups).map(([k, t]) => [k, finish(t, pricing)])),
    recent_errors: errors,
    ...(entries ? { entries: rows.slice(-entries).map(({ e, cost }) => ({ ...e, est_cost: cost })) } : {})
  }
}

export const USAGE_GROUPS = Object.keys(GROUPS)
