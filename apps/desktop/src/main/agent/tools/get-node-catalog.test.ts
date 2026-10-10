import { describe, it, expect } from 'vitest'
import { createGetNodeCatalogTool } from './get-node-catalog'
import type { AgentToolContext } from './types'
import type { NodeDefinition } from '../../automation/node-definitions'

const DEFS: NodeDefinition[] = [
  {
    type: 'download-file',
    label: 'Tải file vào Thư viện',
    category: 'integration',
    icon: 'Download',
    description: 'Tải 1 file từ URL và lưu vào Thư viện',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'url', label: 'URL', type: 'text', required: true },
      { key: 'variable', label: 'Lưu id resource vào biến', type: 'text' }
    ]
  },
  {
    type: 'click',
    label: 'Click',
    category: 'interaction',
    icon: 'MousePointerClick',
    description: 'Click vào 1 phần tử',
    inputs: 1,
    outputs: 1,
    configSchema: [{ key: 'selector', label: 'Selector', type: 'selector', required: true }]
  }
]

function makeCtx(): AgentToolContext {
  return { page: null, profileId: 'profile-1', workflowSnapshot: { nodes: [], edges: [] }, nodeDefinitions: DEFS }
}

function execute(input: { category?: string }) {
  const tool = createGetNodeCatalogTool(makeCtx())
  return tool.execute!(input, {} as never)
}

describe('get_node_catalog', () => {
  it('returns every node type with its config field keys/types when no category is given', async () => {
    const result = (await execute({})) as { ok: boolean; nodes: Array<{ type: string }> }

    expect(result.ok).toBe(true)
    expect(result.nodes.map((n) => n.type)).toEqual(['download-file', 'click'])
    expect(result.nodes[0]).toMatchObject({
      type: 'download-file',
      category: 'integration',
      configSchema: [
        { key: 'url', label: 'URL', type: 'text', required: true },
        { key: 'variable', label: 'Lưu id resource vào biến', type: 'text', required: false }
      ]
    })
  })

  it('filters to a single category when given', async () => {
    const result = (await execute({ category: 'interaction' })) as { nodes: Array<{ type: string }> }
    expect(result.nodes.map((n) => n.type)).toEqual(['click'])
  })

  it('returns an empty list for an unknown category instead of erroring', async () => {
    const result = (await execute({ category: 'not-a-real-category' })) as { ok: boolean; nodes: unknown[] }
    expect(result.ok).toBe(true)
    expect(result.nodes).toEqual([])
  })
})
