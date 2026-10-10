import { describe, it, expect, vi, afterEach } from 'vitest'
import { downloadToBuffer, extensionFromUrl } from './download'

describe('downloadToBuffer', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('fetches the url and returns its bytes as a Buffer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => null },
        arrayBuffer: () => Promise.resolve(new TextEncoder().encode('hello').buffer)
      })
    )
    const buffer = await downloadToBuffer('https://cdn.example.com/x.png')
    expect(buffer.toString()).toBe('hello')
  })

  it('throws with the status code when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }))
    await expect(downloadToBuffer('https://cdn.example.com/x.png')).rejects.toThrow('403')
  })

  it('rejects based on Content-Length before even reading the body', async () => {
    const arrayBuffer = vi.fn()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, headers: { get: () => '999999999' }, arrayBuffer })
    )
    await expect(downloadToBuffer('https://cdn.example.com/huge.bin', 1000)).rejects.toThrow(/quá lớn/)
    expect(arrayBuffer).not.toHaveBeenCalled()
  })

  it('rejects based on actual downloaded size even when Content-Length was absent/wrong', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => null },
        arrayBuffer: () => Promise.resolve(new Uint8Array(2000).buffer)
      })
    )
    await expect(downloadToBuffer('https://cdn.example.com/x.bin', 1000)).rejects.toThrow(/quá lớn/)
  })
})

describe('extensionFromUrl', () => {
  it('extracts a plain extension from the path', () => {
    expect(extensionFromUrl('https://cdn.example.com/out/image.png')).toBe('png')
  })

  it('lowercases the extension', () => {
    expect(extensionFromUrl('https://cdn.example.com/out/IMAGE.PNG')).toBe('png')
  })

  it('returns null when the url has no file extension (e.g. a query-only render endpoint)', () => {
    expect(extensionFromUrl('https://cdn.example.com/render?id=abc')).toBeNull()
  })

  it('returns null for a malformed url instead of throwing', () => {
    expect(extensionFromUrl('not a url at all')).toBeNull()
  })
})
