import { describe, it, expect, vi } from 'vitest'
import { runProviderJob } from './job-runner'
import type { JobResult } from './types'

describe('runProviderJob', () => {
  it('returns immediately when the first poll is already terminal', async () => {
    const provider = {
      submit: vi.fn().mockResolvedValue('job-1'),
      poll: vi.fn().mockResolvedValue({ status: 'succeeded', outputUrl: 'https://example.com/out.mp4' } as JobResult)
    }

    const result = await runProviderJob(provider, { prompt: 'x' }, { pollIntervalMs: 1 })

    expect(result.status).toBe('succeeded')
    expect(provider.submit).toHaveBeenCalledTimes(1)
    expect(provider.poll).toHaveBeenCalledTimes(1)
  })

  it('polls repeatedly until a terminal status, calling onProgress each time', async () => {
    const statuses: JobResult[] = [
      { status: 'running', progressPct: 10 },
      { status: 'running', progressPct: 50 },
      { status: 'succeeded', outputUrl: 'https://example.com/out.mp4' }
    ]
    const provider = {
      submit: vi.fn().mockResolvedValue('job-1'),
      poll: vi.fn().mockImplementation(() => Promise.resolve(statuses.shift()!))
    }
    const onProgress = vi.fn()

    const result = await runProviderJob(provider, { prompt: 'x' }, { pollIntervalMs: 1, onProgress })

    expect(result.status).toBe('succeeded')
    expect(provider.poll).toHaveBeenCalledTimes(3)
    expect(onProgress).toHaveBeenCalledTimes(3)
  })

  it('stops on failed/cancelled without further polling', async () => {
    const provider = {
      submit: vi.fn().mockResolvedValue('job-1'),
      poll: vi.fn().mockResolvedValue({ status: 'failed', error: 'boom' } as JobResult)
    }

    const result = await runProviderJob(provider, { prompt: 'x' }, { pollIntervalMs: 1 })

    expect(result.status).toBe('failed')
    expect(provider.poll).toHaveBeenCalledTimes(1)
  })

  it('never retries submit() even if it throws — the caller sees the error directly', async () => {
    const provider = {
      submit: vi.fn().mockRejectedValue(new Error('payment declined')),
      poll: vi.fn()
    }

    await expect(runProviderJob(provider, { prompt: 'x' }, { pollIntervalMs: 1 })).rejects.toThrow('payment declined')
    expect(provider.submit).toHaveBeenCalledTimes(1)
    expect(provider.poll).not.toHaveBeenCalled()
  })

  it('throws a timeout error if the job never reaches a terminal status', async () => {
    const provider = {
      submit: vi.fn().mockResolvedValue('job-1'),
      poll: vi.fn().mockResolvedValue({ status: 'running' } as JobResult)
    }

    await expect(
      runProviderJob(provider, { prompt: 'x' }, { pollIntervalMs: 1, maxWaitMs: 5 })
    ).rejects.toThrow('timed out')
  })
})
