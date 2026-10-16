import { randomUUID } from 'node:crypto'

/**
 * Sinh video/ảnh mất từ vài chục giây tới vài phút — lâu hơn timeout của
 * nhiều MCP client. Mọi việc nặng chạy thành job nền: tool trả job_id ngay,
 * agent gọi job_wait / job_status để theo dõi. Job chỉ sống trong process;
 * trạng thái asset thật nằm ở project.json nên restart server không mất kết quả.
 */
const jobs = new Map()

export function startJob(kind, projectId, fn) {
  const job = {
    id: randomUUID().slice(0, 8),
    kind,
    project_id: projectId,
    status: 'running',
    log: [],
    result: null,
    error: null,
    started_at: new Date().toISOString(),
    finished_at: null
  }
  const log = (msg) => {
    job.log.push(`${new Date().toISOString().slice(11, 19)} ${msg}`)
    if (job.log.length > 200) job.log.splice(0, job.log.length - 200)
  }
  /** Tiến độ cho agent báo người dùng từng phút: { step, total, done, failed }. */
  log.progress = (p) => Object.assign((job.progress ||= {}), p)
  job.promise = (async () => {
    try {
      job.result = await fn(log)
      job.status = hasFailures(job.result) ? 'completed_with_errors' : 'succeeded'
    } catch (err) {
      job.error = err.message
      job.status = 'failed'
      log(`LỖI: ${err.message}`)
    } finally {
      job.finished_at = new Date().toISOString()
    }
  })()
  jobs.set(job.id, job)
  return job
}

/** Bước nào có mục lỗi (kể cả lồng trong báo cáo pipeline) → agent cần biết để sửa và chạy lại. */
function hasFailures(result) {
  if (!result || typeof result !== 'object') return false
  if (Array.isArray(result.failed) && result.failed.length) return true
  return Object.values(result).some((v) => v && typeof v === 'object' && !Array.isArray(v) && hasFailures(v))
}

export function getJob(id) {
  const job = jobs.get(id)
  if (!job) throw new Error(`Không có job "${id}" (job chỉ tồn tại trong phiên server hiện tại — xem trạng thái thật bằng project_get)`)
  return job
}

export function listJobs(projectId) {
  return [...jobs.values()].filter((j) => !projectId || j.project_id === projectId).map(view)
}

/** Chờ job tối đa `timeoutSec` giây rồi trả trạng thái hiện tại (xong hay chưa). */
export async function waitJob(id, timeoutSec) {
  const job = getJob(id)
  await Promise.race([job.promise, new Promise((r) => setTimeout(r, timeoutSec * 1000))])
  return view(job, 30)
}

export function view(job, logTail = 10) {
  return {
    job_id: job.id,
    kind: job.kind,
    project_id: job.project_id,
    status: job.status,
    started_at: job.started_at,
    finished_at: job.finished_at,
    elapsed_sec: Math.round(((job.finished_at ? Date.parse(job.finished_at) : Date.now()) - Date.parse(job.started_at)) / 1000),
    ...(job.progress ? { progress: job.progress } : {}),
    recent_log: job.log.slice(-logTail),
    ...(job.error ? { error: job.error } : {}),
    ...(job.result ? { result: job.result } : {})
  }
}
