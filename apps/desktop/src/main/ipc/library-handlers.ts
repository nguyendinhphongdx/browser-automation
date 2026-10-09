import type { IpcMain } from 'electron'
import { dialog } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import {
  getAllResources, getResourceById, getResourcesByKind, getChildren, searchResources,
  createFolder, createResourceFromBuffer, createResourceFromText, updateResourceMetadata,
  moveResource, deleteResource, getResourceFileBuffer, getResourceTextContent, getResourceDataUrl,
  mimeTypeForExtension
} from '../services/library-service'
import type { LibraryResourceKind } from '../../shared/types'

export function registerLibraryHandlers(ipcMain: IpcMain) {
  ipcMain.handle('library:getAll', () => getAllResources())
  ipcMain.handle('library:getByKind', (_e, kind: LibraryResourceKind) => getResourcesByKind(kind))
  ipcMain.handle('library:get', (_e, id: string) => getResourceById(id))
  ipcMain.handle('library:getChildren', (_e, parentId: string | null) => getChildren(parentId))
  ipcMain.handle('library:search', (_e, query: string) => searchResources(query))

  ipcMain.handle('library:createFolder', (_e, name: string, parentId?: string | null) =>
    createFolder(name, parentId ?? null)
  )

  ipcMain.handle(
    'library:uploadFromDialog',
    async (_e, opts?: { kind?: LibraryResourceKind; parentId?: string | null }) => {
      const result = await dialog.showOpenDialog({ properties: ['openFile'] })
      if (result.canceled || result.filePaths.length === 0) return null

      const filePath = result.filePaths[0]
      const buffer = fs.readFileSync(filePath)
      const originalFilename = path.basename(filePath)
      const extension = path.extname(filePath).slice(1) || 'bin'
      const mimeType = mimeTypeForExtension(extension)
      const kind: LibraryResourceKind = opts?.kind ?? (mimeType.startsWith('image/') ? 'image' : 'file')

      return createResourceFromBuffer({
        name: originalFilename,
        kind,
        mimeType,
        originalFilename,
        extension,
        buffer,
        parentId: opts?.parentId ?? null,
        objectType: 'manual'
      })
    }
  )

  ipcMain.handle(
    'library:createPromptTemplate',
    (_e, name: string, text: string, opts?: { tags?: string[]; parentId?: string | null }) =>
      createResourceFromText({
        name,
        kind: 'prompt-template',
        mimeType: 'text/plain',
        extension: 'txt',
        text,
        tags: opts?.tags,
        parentId: opts?.parentId ?? null,
        objectType: 'manual'
      })
  )

  ipcMain.handle(
    'library:updateMetadata',
    (_e, id: string, data: { name?: string; tags?: string[]; category?: string; notes?: string }) =>
      updateResourceMetadata(id, data)
  )

  ipcMain.handle('library:move', (_e, id: string, newParentId: string | null) => moveResource(id, newParentId))
  ipcMain.handle('library:delete', (_e, id: string) => deleteResource(id))

  ipcMain.handle('library:getTextContent', (_e, id: string) => getResourceTextContent(id))
  ipcMain.handle('library:getDataUrl', (_e, id: string) => getResourceDataUrl(id))

  ipcMain.handle('library:exportToDisk', async (_e, id: string) => {
    const resource = getResourceById(id)
    const buffer = getResourceFileBuffer(id)
    if (!resource || !buffer) return false

    const result = await dialog.showSaveDialog({
      defaultPath: resource.originalFilename || `${resource.name}.${resource.extension}`
    })
    if (result.canceled || !result.filePath) return false
    fs.writeFileSync(result.filePath, buffer)
    return true
  })
}
