import { describe, it, expect, vi, afterEach } from 'vitest'
import { DownloadFileNode, HttpRequestNode } from './integration'
import type { ExecutionContext, NodeInput } from './base-node'

const downloadToBuffer = vi.fn()
const extensionFromUrl = vi.fn()
const createResourceFromBuffer = vi.fn()

vi.mock('../../download', () => ({
  downloadToBuffer: (...args: unknown[]) => downloadToBuffer(...args),
  extensionFromUrl: (...args: unknown[]) => extensionFromUrl(...args)
}))

vi.mock('../../services/library-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/library-service')>()
  return {
    ...actual,
    createResourceFromBuffer: (...args: unknown[]) => createResourceFromBuffer(...args)
  }
})

function makeCtx(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
  return {
    page: { isClosed: () => true } as unknown as ExecutionContext['page'],
    context: {} as unknown as ExecutionContext['context'],
    profileId: 'profile-1',
    variables: {},
    logs: [],
    aborted: false,
    depth: 0,
    ...overrides
  }
}

function makeInput(config: Record<string, unknown>): NodeInput {
  return { nodeId: 'n1', label: 'Tải file vào Thư viện', config }
}

describe('DownloadFileNode', () => {
  afterEach(() => {
    downloadToBuffer.mockReset()
    extensionFromUrl.mockReset()
    createResourceFromBuffer.mockReset()
  })

  it('downloads the url, saves it to the Library, and stores the resource id in a variable', async () => {
    downloadToBuffer.mockResolvedValue(Buffer.from('bytes'))
    extensionFromUrl.mockReturnValue('png')
    createResourceFromBuffer.mockReturnValue({ id: 'r1', name: 'cat.png' })

    const ctx = makeCtx({ workflowId: 'wf-1' })
    const node = new DownloadFileNode(ctx, makeInput({ url: 'https://cdn.example.com/cat.png', variable: 'imgId' }))
    await node.run()

    expect(downloadToBuffer).toHaveBeenCalledWith('https://cdn.example.com/cat.png')
    const call = createResourceFromBuffer.mock.calls[0][0]
    expect(call.extension).toBe('png')
    expect(call.objectType).toBe('workflow')
    expect(call.objectId).toBe('wf-1')
    expect(ctx.variables.imgId).toBe('r1')
  })

  it('resolves {{variable}} in the url — the normal way a prior get-attribute output feeds this node', async () => {
    downloadToBuffer.mockResolvedValue(Buffer.from('bytes'))
    extensionFromUrl.mockReturnValue('jpg')
    createResourceFromBuffer.mockReturnValue({ id: 'r2', name: 'x.jpg' })

    const ctx = makeCtx({ variables: { imgSrc: 'https://cdn.example.com/x.jpg' } })
    const node = new DownloadFileNode(ctx, makeInput({ url: '{{imgSrc}}' }))
    await node.run()

    expect(downloadToBuffer).toHaveBeenCalledWith('https://cdn.example.com/x.jpg')
  })

  it('derives the resource name from the url + a timestamp when "name" is not given — distinguishes repeat downloads of the same filename', async () => {
    downloadToBuffer.mockResolvedValue(Buffer.from('bytes'))
    extensionFromUrl.mockReturnValue('png')
    createResourceFromBuffer.mockReturnValue({ id: 'r3', name: 'cat.png ...' })

    const node = new DownloadFileNode(makeCtx(), makeInput({ url: 'https://cdn.example.com/path/cat.png' }))
    await node.run()

    const name = createResourceFromBuffer.mock.calls[0][0].name as string
    expect(name).toMatch(/^cat\.png \d{2}:\d{2}:\d{2} \d{2}\/\d{2}\/\d{4}$/)
  })

  it('leaves a user-provided "name" untouched — no timestamp appended', async () => {
    downloadToBuffer.mockResolvedValue(Buffer.from('bytes'))
    extensionFromUrl.mockReturnValue('png')
    createResourceFromBuffer.mockReturnValue({ id: 'r3b', name: 'Ảnh nhân vật chính' })

    const node = new DownloadFileNode(
      makeCtx(),
      makeInput({ url: 'https://cdn.example.com/path/cat.png', name: 'Ảnh nhân vật chính' })
    )
    await node.run()

    expect(createResourceFromBuffer.mock.calls[0][0].name).toBe('Ảnh nhân vật chính')
  })

  it('does not require a variable — the saved resource id is optional to capture', async () => {
    downloadToBuffer.mockResolvedValue(Buffer.from('bytes'))
    extensionFromUrl.mockReturnValue('png')
    createResourceFromBuffer.mockReturnValue({ id: 'r4', name: 'x.png' })

    const ctx = makeCtx()
    await new DownloadFileNode(ctx, makeInput({ url: 'https://cdn.example.com/x.png' })).run()

    expect(ctx.variables).toEqual({})
  })
})

describe('HttpRequestNode (existing behavior, unchanged)', () => {
  it('still parses a JSON response into the configured variable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200, text: () => Promise.resolve('{"a":1}') }))
    const ctx = makeCtx()
    await new HttpRequestNode(ctx, makeInput({ url: 'https://api.example.com', variable: 'resp' })).run()
    expect(ctx.variables.resp).toEqual({ a: 1 })
    vi.unstubAllGlobals()
  })
})
