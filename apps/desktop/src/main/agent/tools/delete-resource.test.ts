import { describe, it, expect, vi, afterEach } from 'vitest'
import { createDeleteResourceTool } from './delete-resource'
import type { AgentToolContext } from './types'

const getResourceById = vi.fn()
const deleteResource = vi.fn()

vi.mock('../../services/library-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/library-service')>()
  return {
    ...actual,
    getResourceById: (...args: unknown[]) => getResourceById(...args),
    deleteResource: (...args: unknown[]) => deleteResource(...args)
  }
})

function makeCtx(): AgentToolContext {
  return { page: null, profileId: 'profile-1', workflowSnapshot: { nodes: [], edges: [] }, nodeDefinitions: [] }
}

function execute(input: { id: string }) {
  const tool = createDeleteResourceTool(makeCtx())
  return tool.execute!(input, {} as never)
}

describe('delete_resource', () => {
  afterEach(() => {
    getResourceById.mockReset()
    deleteResource.mockReset()
  })

  it('deletes an existing resource', async () => {
    getResourceById.mockReturnValue({ id: 'r1', name: 'Ảnh cũ' })
    deleteResource.mockReturnValue(true)

    const result = (await execute({ id: 'r1' })) as Record<string, unknown>

    expect(result).toEqual({ ok: true, id: 'r1', name: 'Ảnh cũ' })
  })

  it('rejects when the resource does not exist, without calling deleteResource', async () => {
    getResourceById.mockReturnValue(null)

    const result = (await execute({ id: 'missing' })) as Record<string, unknown>

    expect(result.ok).toBe(false)
    expect(deleteResource).not.toHaveBeenCalled()
  })

  it('surfaces the "folder still has children" error as ok:false, not a throw', async () => {
    getResourceById.mockReturnValue({ id: 'f1', name: 'Thư mục', kind: 'folder' })
    deleteResource.mockImplementation(() => {
      throw new Error('Thư mục còn chứa tài nguyên bên trong — hãy xoá hoặc di chuyển chúng trước')
    })

    const result = (await execute({ id: 'f1' })) as Record<string, unknown>

    expect(result.ok).toBe(false)
    expect(String(result.error)).toMatch(/còn chứa/)
  })
})
