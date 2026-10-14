import { describe, it, expect } from 'vitest'
import { assertPipelineRunnable } from './assert-runnable'
import type { VideoNode } from '../../shared/types'

function node(id: string, nodeType: string): VideoNode {
  return { id, type: 'videoStudioNode', position: { x: 0, y: 0 }, data: { label: id, nodeType, config: {} } }
}

describe('assertPipelineRunnable', () => {
  it('throws when there are no nodes at all', () => {
    expect(() => assertPipelineRunnable([])).toThrow('không có node nào')
  })

  it('throws when the pipeline never saves anything to the Library', () => {
    expect(() => assertPipelineRunnable([node('a', 'generate-image')])).toThrow('save-to-library')
  })

  it('does not throw when a save-to-library node is present', () => {
    expect(() => assertPipelineRunnable([node('a', 'generate-image'), node('b', 'save-to-library')])).not.toThrow()
  })
})
