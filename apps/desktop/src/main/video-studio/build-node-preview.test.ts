import { describe, it, expect, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { buildNodeOutputPreview } from './build-node-preview'

const tmpFiles: string[] = []

function writeTmp(ext: string, content: string | Buffer): string {
  const filePath = path.join(os.tmpdir(), `build-node-preview-test-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`)
  fs.writeFileSync(filePath, content)
  tmpFiles.push(filePath)
  return filePath
}

afterEach(() => {
  for (const f of tmpFiles.splice(0)) {
    try {
      fs.unlinkSync(f)
    } catch {
      // đã xoá hoặc chưa từng tồn tại — bỏ qua
    }
  }
})

describe('buildNodeOutputPreview', () => {
  it('returns null for an unknown node type', () => {
    expect(buildNodeOutputPreview('not-a-real-type', { image: 'x.png' })).toBeNull()
  })

  it('builds a text preview straight from a TEXT output, no file read', () => {
    const preview = buildNodeOutputPreview('scene-prompt', { text: 'Milo khám phá thành phố neon' })
    expect(preview).toEqual({ kind: 'text', text: 'Milo khám phá thành phố neon' })
  })

  it('truncates long text to 200 chars with an ellipsis', () => {
    const longText = 'a'.repeat(250)
    const preview = buildNodeOutputPreview('scene-prompt', { text: longText })
    expect(preview?.kind).toBe('text')
    expect(preview?.text?.length).toBe(201) // 200 ký tự + '…'
    expect(preview?.text?.endsWith('…')).toBe(true)
  })

  it('builds an image preview as a base64 data URL from a real file', () => {
    const filePath = writeTmp('png', Buffer.from([0x89, 0x50, 0x4e, 0x47]))
    const preview = buildNodeOutputPreview('generate-image', { image: filePath })
    expect(preview?.kind).toBe('image')
    expect(preview?.dataUrl).toMatch(/^data:image\/png;base64,/)
  })

  it('returns null when the output file no longer exists on disk', () => {
    const preview = buildNodeOutputPreview('generate-image', { image: '/tmp/does-not-exist-at-all.png' })
    expect(preview).toBeNull()
  })

  it('returns null when the output extension has no known mime mapping', () => {
    const filePath = writeTmp('bin', 'not a media file')
    const preview = buildNodeOutputPreview('generate-image', { image: filePath })
    expect(preview).toBeNull()
  })
})
