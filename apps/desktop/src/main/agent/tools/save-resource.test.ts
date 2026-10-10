import { describe, it, expect, vi, afterEach } from 'vitest'
import type { z } from 'zod'
import { createSaveResourceTool, saveResourceInputSchema } from './save-resource'
import type { AgentToolContext } from './types'

const createResourceFromBuffer = vi.fn()

vi.mock('../../services/library-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/library-service')>()
  return { ...actual, createResourceFromBuffer: (...args: unknown[]) => createResourceFromBuffer(...args) }
})

function makeCtx(): AgentToolContext {
  return { page: null, profileId: 'profile-1', workflowSnapshot: { nodes: [], edges: [] }, nodeDefinitions: [] }
}

function execute(input: z.infer<typeof saveResourceInputSchema>) {
  const tool = createSaveResourceTool(makeCtx())
  return tool.execute!(input, {} as never)
}

describe('save_resource', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    createResourceFromBuffer.mockReset()
  })

  // The .refine() mutual-exclusivity check runs at AI SDK's parse step,
  // BEFORE execute() is ever called — testing it against the schema
  // directly, not through execute() (which trusts its input is already
  // valid, same as every other tool in this codebase).
  it('schema rejects when neither sourceUrl nor content is given', () => {
    const result = saveResourceInputSchema.safeParse({ name: 'x', kind: 'file' })
    expect(result.success).toBe(false)
  })

  it('schema rejects when BOTH sourceUrl and content are given', () => {
    const result = saveResourceInputSchema.safeParse({
      name: 'x',
      kind: 'file',
      sourceUrl: 'https://cdn.example.com/x.png',
      content: 'hello'
    })
    expect(result.success).toBe(false)
  })

  it('schema accepts sourceUrl alone, and content alone', () => {
    expect(saveResourceInputSchema.safeParse({ name: 'x', kind: 'file', sourceUrl: 'https://cdn.example.com/x.png' }).success).toBe(true)
    expect(saveResourceInputSchema.safeParse({ name: 'x', kind: 'file', content: 'hello' }).success).toBe(true)
  })

  it('downloads sourceUrl instead of requiring the model to inline base64', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => null },
      arrayBuffer: () => Promise.resolve(new TextEncoder().encode('fake-png-bytes').buffer)
    })
    vi.stubGlobal('fetch', fetchMock)
    createResourceFromBuffer.mockReturnValue({ id: 'r1', name: 'Ảnh nhân vật' })

    const result = (await execute({
      name: 'Ảnh nhân vật',
      kind: 'image',
      sourceUrl: 'https://cdn.example.com/out/image.png'
    })) as Record<string, unknown>

    expect(fetchMock).toHaveBeenCalledWith('https://cdn.example.com/out/image.png')
    expect(result).toEqual({ ok: true, id: 'r1', name: 'Ảnh nhân vật' })
    const call = createResourceFromBuffer.mock.calls[0][0]
    expect(call.extension).toBe('png')
    expect(call.buffer.toString()).toBe('fake-png-bytes')
  })

  it('falls back to defaultExtensionForKind when the URL has no recognizable extension', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => null },
        arrayBuffer: () => Promise.resolve(new TextEncoder().encode('bytes').buffer)
      })
    )
    createResourceFromBuffer.mockReturnValue({ id: 'r2', name: 'x' })

    await execute({ name: 'x', kind: 'image', sourceUrl: 'https://cdn.example.com/out/render?id=abc' })

    expect(createResourceFromBuffer.mock.calls[0][0].extension).toBe('png') // defaultExtensionForKind('image')
  })

  it('returns ok:false (not a throw) when the download fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))

    const result = (await execute({ name: 'x', kind: 'file', sourceUrl: 'https://cdn.example.com/missing' })) as Record<
      string,
      unknown
    >

    expect(result.ok).toBe(false)
    expect(String(result.error)).toMatch(/404/)
    expect(createResourceFromBuffer).not.toHaveBeenCalled()
  })

  it('still supports plain text content (crawled notes/JSON) with no sourceUrl', async () => {
    createResourceFromBuffer.mockReturnValue({ id: 'r3', name: 'Ghi chú' })

    const result = (await execute({ name: 'Ghi chú', kind: 'data-export', content: '{"a":1}' })) as Record<
      string,
      unknown
    >

    expect(result).toEqual({ ok: true, id: 'r3', name: 'Ghi chú' })
    const call = createResourceFromBuffer.mock.calls[0][0]
    expect(call.buffer.toString('utf-8')).toBe('{"a":1}')
    expect(call.extension).toBe('json') // defaultExtensionForKind('data-export')
  })
})
