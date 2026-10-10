import { describe, it, expect, vi, afterEach } from 'vitest'
import { createUpdateResourceMetadataTool } from './update-resource-metadata'
import type { AgentToolContext } from './types'

const getResourceById = vi.fn()
const updateResourceMetadata = vi.fn()

vi.mock('../../services/library-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/library-service')>()
  return {
    ...actual,
    getResourceById: (...args: unknown[]) => getResourceById(...args),
    updateResourceMetadata: (...args: unknown[]) => updateResourceMetadata(...args)
  }
})

function makeCtx(): AgentToolContext {
  return { page: null, profileId: 'profile-1', workflowSnapshot: { nodes: [], edges: [] }, nodeDefinitions: [] }
}

function execute(input: { id: string; name?: string; tags?: string[]; category?: string; notes?: string }) {
  const tool = createUpdateResourceMetadataTool(makeCtx())
  return tool.execute!(input, {} as never)
}

describe('update_resource_metadata', () => {
  afterEach(() => {
    getResourceById.mockReset()
    updateResourceMetadata.mockReset()
  })

  it('renames a resource', async () => {
    getResourceById.mockReturnValue({ id: 'r1', kind: 'image' })
    updateResourceMetadata.mockReturnValue({ id: 'r1', name: 'Tên mới' })

    const result = (await execute({ id: 'r1', name: 'Tên mới' })) as Record<string, unknown>

    expect(result).toEqual({ ok: true, id: 'r1', name: 'Tên mới' })
    expect(updateResourceMetadata).toHaveBeenCalledWith('r1', {
      name: 'Tên mới',
      tags: undefined,
      category: undefined,
      notes: undefined
    })
  })

  it('updates only tags, leaving name untouched', async () => {
    getResourceById.mockReturnValue({ id: 'r1', kind: 'image' })
    updateResourceMetadata.mockReturnValue({ id: 'r1', name: 'Ảnh A' })

    await execute({ id: 'r1', tags: ['nhân vật', 'thỏ'] })

    expect(updateResourceMetadata).toHaveBeenCalledWith('r1', {
      name: undefined,
      tags: ['nhân vật', 'thỏ'],
      category: undefined,
      notes: undefined
    })
  })

  it('rejects when the resource does not exist', async () => {
    getResourceById.mockReturnValue(null)

    const result = (await execute({ id: 'missing', name: 'x' })) as Record<string, unknown>

    expect(result.ok).toBe(false)
    expect(updateResourceMetadata).not.toHaveBeenCalled()
  })
})
