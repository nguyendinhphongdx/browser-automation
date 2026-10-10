import { describe, it, expect, vi, afterEach } from 'vitest'
import { createCreateLibraryFolderTool } from './create-library-folder'
import type { AgentToolContext } from './types'

const createFolder = vi.fn()
const getResourceById = vi.fn()

vi.mock('../../services/library-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/library-service')>()
  return {
    ...actual,
    createFolder: (...args: unknown[]) => createFolder(...args),
    getResourceById: (...args: unknown[]) => getResourceById(...args)
  }
})

function makeCtx(): AgentToolContext {
  return { page: null, profileId: 'profile-1', workflowSnapshot: { nodes: [], edges: [] }, nodeDefinitions: [] }
}

function execute(input: { name: string; parentId?: string }) {
  const tool = createCreateLibraryFolderTool(makeCtx())
  return tool.execute!(input, {} as never)
}

describe('create_library_folder', () => {
  afterEach(() => {
    createFolder.mockReset()
    getResourceById.mockReset()
  })

  it('creates a root-level folder tagged objectType "agent"', async () => {
    createFolder.mockReturnValue({ id: 'f1', name: 'Nhân vật phim A' })

    const result = (await execute({ name: 'Nhân vật phim A' })) as Record<string, unknown>

    expect(result).toEqual({ ok: true, id: 'f1', name: 'Nhân vật phim A' })
    expect(createFolder).toHaveBeenCalledWith('Nhân vật phim A', null, 'agent')
  })

  it('creates inside an existing parent folder', async () => {
    getResourceById.mockReturnValue({ id: 'parent1', kind: 'folder' })
    createFolder.mockReturnValue({ id: 'f2', name: 'Cảnh 1' })

    await execute({ name: 'Cảnh 1', parentId: 'parent1' })

    expect(createFolder).toHaveBeenCalledWith('Cảnh 1', 'parent1', 'agent')
  })

  it('rejects when parentId does not exist, without calling createFolder', async () => {
    getResourceById.mockReturnValue(null)

    const result = (await execute({ name: 'x', parentId: 'missing' })) as Record<string, unknown>

    expect(result.ok).toBe(false)
    expect(String(result.error)).toMatch(/missing/)
    expect(createFolder).not.toHaveBeenCalled()
  })

  it('rejects when parentId points at a non-folder resource', async () => {
    getResourceById.mockReturnValue({ id: 'img1', kind: 'image' })

    const result = (await execute({ name: 'x', parentId: 'img1' })) as Record<string, unknown>

    expect(result.ok).toBe(false)
    expect(String(result.error)).toMatch(/không phải thư mục/)
    expect(createFolder).not.toHaveBeenCalled()
  })
})
