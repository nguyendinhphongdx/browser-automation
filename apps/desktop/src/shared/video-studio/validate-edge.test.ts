import { describe, it, expect } from 'vitest'
import { validateVideoEdge } from './validate-edge'
import type { VideoSocketDef } from '../types'

function socket(type: VideoSocketDef['type'], name = 's'): VideoSocketDef {
  return { name, type, required: true }
}

describe('validateVideoEdge', () => {
  it('allows an edge when source and target have the exact same single type', () => {
    expect(validateVideoEdge(socket('IMAGE'), socket('IMAGE'))).toBe(true)
  })

  it('rejects an edge when source and target types differ', () => {
    expect(validateVideoEdge(socket('IMAGE'), socket('VIDEO'))).toBe(false)
  })

  it('allows an edge when the target accepts an array of types including the source type', () => {
    expect(validateVideoEdge(socket('IMAGE'), socket(['IMAGE', 'VIDEO', 'AUDIO']))).toBe(true)
    expect(validateVideoEdge(socket('VIDEO'), socket(['IMAGE', 'VIDEO', 'AUDIO']))).toBe(true)
  })

  it('rejects an edge when the source type is not in the target array', () => {
    expect(validateVideoEdge(socket('TEXT'), socket(['IMAGE', 'VIDEO', 'AUDIO']))).toBe(false)
  })

  it('rejects when either socket is missing', () => {
    expect(validateVideoEdge(undefined, socket('IMAGE'))).toBe(false)
    expect(validateVideoEdge(socket('IMAGE'), undefined)).toBe(false)
  })
})
