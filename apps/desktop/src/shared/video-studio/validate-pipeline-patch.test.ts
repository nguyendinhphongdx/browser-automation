import { describe, it, expect } from 'vitest'
import { validateVideoPipelinePatch } from './validate-pipeline-patch'
import type { VideoNodeDefinition } from '../types'

const NODE_DEFS: VideoNodeDefinition[] = [
  {
    type: 'scene-prompt',
    label: 'Prompt cảnh',
    category: 'input',
    icon: 'FileText',
    description: '',
    inputs: [],
    outputs: [{ name: 'text', type: 'TEXT', required: true }],
    configSchema: [{ key: 'prompt', label: 'Prompt', type: 'text', required: true }]
  },
  {
    type: 'generate-video',
    label: 'Tạo video',
    category: 'generate',
    icon: 'Film',
    description: '',
    inputs: [{ name: 'prompt', type: 'TEXT', required: false }],
    outputs: [{ name: 'video', type: 'VIDEO', required: true }],
    configSchema: [{ key: 'provider', label: 'Provider', type: 'select', options: [{ label: 'Kling', value: 'kling' }], required: true }]
  }
]

describe('validateVideoPipelinePatch', () => {
  it('rejects an unknown nodeType', () => {
    const { errors } = validateVideoPipelinePatch(
      { type: 'add_nodes', nodes: [{ id: 'n1', nodeType: 'not-real', label: 'X', config: {} }] },
      NODE_DEFS,
      []
    )
    expect(errors.some((e) => e.includes('not-real'))).toBe(true)
  })

  it('rejects a node missing a required config field', () => {
    const { errors } = validateVideoPipelinePatch(
      { type: 'add_nodes', nodes: [{ id: 'n1', nodeType: 'generate-video', label: 'X', config: {} }] },
      NODE_DEFS,
      []
    )
    expect(errors.some((e) => e.includes('provider'))).toBe(true)
  })

  it('accepts a valid add_nodes patch with matching socket types', () => {
    const { errors } = validateVideoPipelinePatch(
      {
        type: 'add_nodes',
        nodes: [
          { id: 'n1', nodeType: 'scene-prompt', label: 'Cảnh 1', config: { prompt: 'hello' } },
          { id: 'n2', nodeType: 'generate-video', label: 'Video 1', config: { provider: 'kling' } }
        ],
        edges: [{ source: 'n1', target: 'n2', sourceHandle: 'text', targetHandle: 'prompt' }]
      },
      NODE_DEFS,
      []
    )
    expect(errors).toEqual([])
  })

  it('rejects an edge connecting mismatched socket types', () => {
    const NODE_DEFS_WITH_IMAGE_OUTPUT: VideoNodeDefinition[] = [
      ...NODE_DEFS,
      {
        type: 'character-reference',
        label: 'Nhân vật',
        category: 'input',
        icon: 'UserSquare',
        description: '',
        inputs: [],
        outputs: [{ name: 'image', type: 'IMAGE', required: true }],
        configSchema: []
      }
    ]
    const { errors } = validateVideoPipelinePatch(
      {
        type: 'add_nodes',
        nodes: [
          { id: 'n1', nodeType: 'character-reference', label: 'Nhân vật', config: {} },
          { id: 'n2', nodeType: 'generate-video', label: 'Video 1', config: { provider: 'kling' } }
        ],
        // n1 xuất IMAGE nhưng nối vào input "prompt" (TEXT) của n2 — sai type
        edges: [{ source: 'n1', target: 'n2', sourceHandle: 'image', targetHandle: 'prompt' }]
      },
      NODE_DEFS_WITH_IMAGE_OUTPUT,
      []
    )
    expect(errors.some((e) => e.includes('sai kiểu socket'))).toBe(true)
  })

  it('rejects an edge referencing a node id that does not exist', () => {
    const { errors } = validateVideoPipelinePatch(
      {
        type: 'add_nodes',
        nodes: [{ id: 'n1', nodeType: 'scene-prompt', label: 'Cảnh 1', config: { prompt: 'x' } }],
        edges: [{ source: 'n1', target: 'ghost', sourceHandle: 'text', targetHandle: 'prompt' }]
      },
      NODE_DEFS,
      []
    )
    expect(errors.some((e) => e.includes('ghost'))).toBe(true)
  })

  it('rejects update_node targeting a node that does not exist', () => {
    const { errors } = validateVideoPipelinePatch(
      { type: 'update_node', nodeId: 'missing', config: { provider: 'kling' } },
      NODE_DEFS,
      []
    )
    expect(errors.some((e) => e.includes('missing'))).toBe(true)
  })

  it('validates update_node config against the existing node type', () => {
    const { errors } = validateVideoPipelinePatch(
      { type: 'update_node', nodeId: 'existing-1', config: { provider: 'not-an-option' } },
      NODE_DEFS,
      [{ id: 'existing-1', nodeType: 'generate-video' }]
    )
    expect(errors.some((e) => e.includes('provider'))).toBe(true)
  })

  it('edges can reference an existing node already on the canvas, not just local patch ids', () => {
    const { errors } = validateVideoPipelinePatch(
      {
        type: 'add_nodes',
        nodes: [{ id: 'n1', nodeType: 'generate-video', label: 'Video 1', config: { provider: 'kling' } }],
        edges: [{ source: 'existing-1', target: 'n1', sourceHandle: 'text', targetHandle: 'prompt' }]
      },
      NODE_DEFS,
      [{ id: 'existing-1', nodeType: 'scene-prompt' }]
    )
    expect(errors).toEqual([])
  })
})
