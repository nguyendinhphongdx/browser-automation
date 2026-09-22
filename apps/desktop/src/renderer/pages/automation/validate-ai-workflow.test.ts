import { describe, it, expect } from 'vitest'
import { validateAction } from './validate-ai-workflow'
import type { AINodeDefinition } from './ai-node-catalog'

const NODE_DEFS: AINodeDefinition[] = [
  {
    type: 'click',
    label: 'Click',
    category: 'interaction',
    description: 'Click an element',
    configSchema: [
      { key: 'selector', label: 'Selector', type: 'selector', required: true },
      { key: 'button', label: 'Button', type: 'select', options: [{ label: 'Left', value: 'left' }, { label: 'Right', value: 'right' }], defaultValue: 'left' },
    ],
  },
  {
    type: 'if-else',
    label: 'If/Else',
    category: 'flow',
    description: 'Branch on a condition',
    configSchema: [{ key: 'condition', label: 'Condition', type: 'code', required: true }],
  },
]

describe('validateAction', () => {
  it('rejects an unknown nodeType', () => {
    const { errors } = validateAction(
      { type: 'add_nodes', nodes: [{ id: 'n1', nodeType: 'not-a-real-type', label: 'X', config: {} }] },
      NODE_DEFS,
      []
    )
    expect(errors.some((e) => e.includes('not-a-real-type'))).toBe(true)
  })

  it('rejects a node missing a required config field', () => {
    const { errors } = validateAction(
      { type: 'add_nodes', nodes: [{ id: 'n1', nodeType: 'click', label: 'Click', config: {} }] },
      NODE_DEFS,
      []
    )
    expect(errors.some((e) => e.includes('selector'))).toBe(true)
  })

  it('rejects a select field value outside the allowed options', () => {
    const { errors } = validateAction(
      {
        type: 'add_nodes',
        nodes: [{ id: 'n1', nodeType: 'click', label: 'Click', config: { selector: '#btn', button: 'middle' } }],
      },
      NODE_DEFS,
      []
    )
    expect(errors.some((e) => e.includes('button'))).toBe(true)
  })

  it('rejects an if-else node with only one branch edge', () => {
    const { errors } = validateAction(
      {
        type: 'add_nodes',
        nodes: [{ id: 'n1', nodeType: 'if-else', label: 'Check', config: { condition: 'true' } }],
        edges: [{ source: 'n1', target: 'n1', sourceHandle: 'true' }],
      },
      NODE_DEFS,
      []
    )
    expect(errors.some((e) => e.includes('false'))).toBe(true)
  })

  it('rejects an edge referencing a node id that does not exist', () => {
    const { errors } = validateAction(
      {
        type: 'add_nodes',
        nodes: [{ id: 'n1', nodeType: 'click', label: 'Click', config: { selector: '#btn' } }],
        edges: [{ source: 'n1', target: 'ghost-node' }],
      },
      NODE_DEFS,
      []
    )
    expect(errors.some((e) => e.includes('ghost-node'))).toBe(true)
  })

  it('accepts a valid if-else node with both branches declared', () => {
    const { errors } = validateAction(
      {
        type: 'add_nodes',
        nodes: [
          { id: 'n1', nodeType: 'if-else', label: 'Check', config: { condition: 'true' } },
          { id: 'n2', nodeType: 'click', label: 'Click yes', config: { selector: '#yes' } },
          { id: 'n3', nodeType: 'click', label: 'Click no', config: { selector: '#no' } },
        ],
        edges: [
          { source: 'n1', target: 'n2', sourceHandle: 'true' },
          { source: 'n1', target: 'n3', sourceHandle: 'false' },
        ],
      },
      NODE_DEFS,
      []
    )
    expect(errors).toEqual([])
  })

  it('accepts a simple sequential add_nodes action with no edges', () => {
    const { errors } = validateAction(
      { type: 'add_nodes', nodes: [{ id: 'n1', nodeType: 'click', label: 'Click', config: { selector: '#btn' } }] },
      NODE_DEFS,
      []
    )
    expect(errors).toEqual([])
  })

  it('rejects update_node targeting a node that does not exist', () => {
    const { errors } = validateAction(
      { type: 'update_node', nodeId: 'missing', config: { selector: '#x' } },
      NODE_DEFS,
      []
    )
    expect(errors.some((e) => e.includes('missing'))).toBe(true)
  })

  it('validates update_node config against the existing node type', () => {
    const { errors } = validateAction(
      { type: 'update_node', nodeId: 'existing-1', config: { button: 'not-an-option' } },
      NODE_DEFS,
      [{ id: 'existing-1', nodeType: 'click' }]
    )
    expect(errors.some((e) => e.includes('button'))).toBe(true)
  })
})
