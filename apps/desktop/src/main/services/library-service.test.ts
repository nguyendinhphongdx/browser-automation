import { describe, it, expect } from 'vitest'
import { isDescendantOf, timestampSuffix } from './library-service'

function makeLookup(tree: Record<string, string | null>) {
  return (id: string) => (id in tree ? { parentId: tree[id] } : null)
}

describe('isDescendantOf', () => {
  it('true when candidate ancestor IS the node itself', () => {
    const lookup = makeLookup({ a: null })
    expect(isDescendantOf('a', 'a', lookup)).toBe(true)
  })

  it('true for a direct child', () => {
    const lookup = makeLookup({ a: null, b: 'a' })
    expect(isDescendantOf('a', 'b', lookup)).toBe(true)
  })

  it('true for a deep grandchild (walks all the way up)', () => {
    const lookup = makeLookup({ a: null, b: 'a', c: 'b', d: 'c' })
    expect(isDescendantOf('a', 'd', lookup)).toBe(true)
  })

  it('false for an unrelated branch', () => {
    const lookup = makeLookup({ root: null, a: 'root', b: 'root' })
    expect(isDescendantOf('a', 'b', lookup)).toBe(false)
  })

  it('false when candidate is actually an ANCESTOR of id, not a descendant', () => {
    const lookup = makeLookup({ a: null, b: 'a', c: 'b' })
    // c is a descendant of a — moving a's subtree under c would be the
    // cycle; moving c under a is perfectly fine (just re-nesting deeper).
    expect(isDescendantOf('c', 'a', lookup)).toBe(false)
  })

  it('false at the root with no parent chain at all', () => {
    const lookup = makeLookup({ a: null, b: null })
    expect(isDescendantOf('a', 'b', lookup)).toBe(false)
  })
})

describe('timestampSuffix', () => {
  it('formats as "HH:mm:ss DD/MM/YYYY", zero-padded', () => {
    const d = new Date(2026, 2, 5, 9, 7, 3) // 5/3/2026, 09:07:03 — tháng Date() 0-indexed
    expect(timestampSuffix(d)).toBe('09:07:03 05/03/2026')
  })

  it('two calls a moment apart produce different strings (the whole point — distinguishing repeat saves)', () => {
    const a = timestampSuffix(new Date(2026, 0, 1, 10, 0, 0))
    const b = timestampSuffix(new Date(2026, 0, 1, 10, 0, 1))
    expect(a).not.toBe(b)
  })
})
