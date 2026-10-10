import { describe, it, expect, vi, afterEach } from 'vitest'
import { createMoveResourceTool } from './move-resource'
import type { AgentToolContext } from './types'

const getResourceById = vi.fn()
const moveResource = vi.fn()

vi.mock('../../services/library-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/library-service')>()
  return {
    ...actual,
    getResourceById: (...args: unknown[]) => getResourceById(...args),
    moveResource: (...args: unknown[]) => moveResource(...args)
  }
})

function makeCtx(): AgentToolContext {
  return { page: null, profileId: 'profile-1', workflowSnapshot: { nodes: [], edges: [] }, nodeDefinitions: [] }
}

function execute(input: { id: string; newParentId?: string }) {
  const tool = createMoveResourceTool(makeCtx())
  return tool.execute!(input, {} as never)
}

describe('move_resource', () => {
  afterEach(() => {
    getResourceById.mockReset()
    moveResource.mockReset()
  })

  it('moves to an existing folder', async () => {
    getResourceById
      .mockReturnValueOnce({ id: 'r1', kind: 'image' }) // the resource being moved
      .mockReturnValueOnce({ id: 'f1', kind: 'folder' }) // the destination
    moveResource.mockReturnValue({ id: 'r1', name: 'Ảnh A', parentId: 'f1' })

    const result = (await execute({ id: 'r1', newParentId: 'f1' })) as Record<string, unknown>

    expect(result).toEqual({ ok: true, id: 'r1', name: 'Ảnh A', parentId: 'f1' })
    expect(moveResource).toHaveBeenCalledWith('r1', 'f1')
  })

  it('moves to root when newParentId is omitted', async () => {
    getResourceById.mockReturnValueOnce({ id: 'r1', kind: 'image' })
    moveResource.mockReturnValue({ id: 'r1', name: 'Ảnh A', parentId: null })

    await execute({ id: 'r1' })

    expect(moveResource).toHaveBeenCalledWith('r1', null)
  })

  it('rejects when the resource being moved does not exist', async () => {
    getResourceById.mockReturnValueOnce(null)

    const result = (await execute({ id: 'missing' })) as Record<string, unknown>

    expect(result.ok).toBe(false)
    expect(moveResource).not.toHaveBeenCalled()
  })

  it('rejects when the destination does not exist', async () => {
    getResourceById.mockReturnValueOnce({ id: 'r1', kind: 'image' }).mockReturnValueOnce(null)

    const result = (await execute({ id: 'r1', newParentId: 'missing' })) as Record<string, unknown>

    expect(result.ok).toBe(false)
    expect(moveResource).not.toHaveBeenCalled()
  })

  it('rejects when the destination is not a folder', async () => {
    getResourceById.mockReturnValueOnce({ id: 'r1', kind: 'image' }).mockReturnValueOnce({ id: 'r2', kind: 'image' })

    const result = (await execute({ id: 'r1', newParentId: 'r2' })) as Record<string, unknown>

    expect(result.ok).toBe(false)
    expect(moveResource).not.toHaveBeenCalled()
  })

  it('surfaces the cycle-guard error from moveResource as ok:false, not a throw', async () => {
    getResourceById.mockReturnValueOnce({ id: 'f1', kind: 'folder' }).mockReturnValueOnce({ id: 'f2', kind: 'folder' })
    moveResource.mockImplementation(() => {
      throw new Error('Không thể di chuyển 1 thư mục vào chính con/cháu của nó')
    })

    const result = (await execute({ id: 'f1', newParentId: 'f2' })) as Record<string, unknown>

    expect(result.ok).toBe(false)
    expect(String(result.error)).toMatch(/con\/cháu/)
  })
})
