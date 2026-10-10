import { describe, it, expect, vi, afterEach } from 'vitest'
import jwt from 'jsonwebtoken'
import { createKlingProvider } from './kling-provider'

describe('createKlingProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('submit() signs a fresh HS256 JWT (iss = accessKey) and returns the task_id', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { task_id: 'task-123' } })
    })
    vi.stubGlobal('fetch', fetchMock)

    const provider = createKlingProvider('my-access-key', 'my-secret-key')
    const jobId = await provider.submit({ mode: 'text-to-video', prompt: 'a cat', durationSec: 5 })

    expect(jobId).toBe('task-123')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/v1/videos/text2video')
    const authHeader = (init.headers as Record<string, string>).Authorization
    expect(authHeader).toMatch(/^Bearer /)
    const token = authHeader.replace('Bearer ', '')
    const decoded = jwt.verify(token, 'my-secret-key') as { iss: string }
    expect(decoded.iss).toBe('my-access-key')
  })

  it('submit() throws with a clear message when the API responds non-ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 401, text: () => Promise.resolve('unauthorized') })
    )
    const provider = createKlingProvider('ak', 'sk')
    await expect(provider.submit({ mode: 'text-to-video', prompt: 'x' })).rejects.toThrow('Kling submit thất bại')
  })

  it('poll() maps "succeed" to succeeded with the video url', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: { task_status: 'succeed', task_result: { videos: [{ url: 'https://cdn.kling.ai/out.mp4' }] } }
          })
      })
    )
    const provider = createKlingProvider('ak', 'sk')
    const result = await provider.poll('task-123')
    expect(result).toEqual({ status: 'succeeded', outputUrl: 'https://cdn.kling.ai/out.mp4' })
  })

  it('poll() maps "failed" to a failed JobResult', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: { task_status: 'failed' } }) })
    )
    const provider = createKlingProvider('ak', 'sk')
    const result = await provider.poll('task-123')
    expect(result.status).toBe('failed')
  })

  it('poll() treats any other status as still running', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: { task_status: 'processing' } }) })
    )
    const provider = createKlingProvider('ak', 'sk')
    const result = await provider.poll('task-123')
    expect(result.status).toBe('running')
  })
})
