import type { IpcMain } from 'electron'
import { dialog } from 'electron'
import * as fs from 'fs'
import {
  getAllProxies, getProxyById, createProxy, updateProxy, deleteProxy, importProxies, checkProxy
} from '../services/proxy-service'
import {
  getAllEmails, getEmailById, createEmail, updateEmail, deleteEmail, importEmailsFromCSV
} from '../services/email-service'
import {
  getAllCookies, getCookieById, getCookiesByProfileId, createCookie, updateCookie, deleteCookie,
  importCookiesJSON, exportCookiesJSON
} from '../services/cookie-service'

export function registerResourceHandlers(ipcMain: IpcMain) {
  // ── Proxy ──────────────────────────────────────────────
  ipcMain.handle('proxy:getAll', () => getAllProxies())
  ipcMain.handle('proxy:get', (_e, id: string) => getProxyById(id))
  ipcMain.handle('proxy:create', (_e, data) => createProxy(data))
  ipcMain.handle('proxy:update', (_e, id: string, data) => updateProxy(id, data))
  ipcMain.handle('proxy:delete', (_e, id: string) => deleteProxy(id))
  ipcMain.handle('proxy:check', async (_e, id: string) => checkProxy(id))

  ipcMain.handle('proxy:import', async (_e, lines: string[], type?: string) => {
    return importProxies(lines, (type as any) || 'http')
  })

  ipcMain.handle('proxy:importFile', async (event) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Text files', extensions: ['txt', 'csv'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return []
    const content = fs.readFileSync(result.filePaths[0], 'utf-8')
    const lines = content.split('\n')
    return importProxies(lines)
  })

  // ── Email ──────────────────────────────────────────────
  ipcMain.handle('email:getAll', () => getAllEmails())
  ipcMain.handle('email:get', (_e, id: string) => getEmailById(id))
  ipcMain.handle('email:create', (_e, data) => createEmail(data))
  ipcMain.handle('email:update', (_e, id: string, data) => updateEmail(id, data))
  ipcMain.handle('email:delete', (_e, id: string) => deleteEmail(id))

  ipcMain.handle('email:importCSV', async (_e, csvContent?: string) => {
    if (csvContent) return importEmailsFromCSV(csvContent)

    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'CSV files', extensions: ['csv', 'txt'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return []
    const content = fs.readFileSync(result.filePaths[0], 'utf-8')
    return importEmailsFromCSV(content)
  })

  // ── Cookie ─────────────────────────────────────────────
  ipcMain.handle('cookie:getAll', () => getAllCookies())
  ipcMain.handle('cookie:get', (_e, id: string) => getCookieById(id))
  ipcMain.handle('cookie:getByProfile', (_e, profileId: string) => getCookiesByProfileId(profileId))
  ipcMain.handle('cookie:create', (_e, data) => createCookie(data))
  ipcMain.handle('cookie:update', (_e, id: string, data) => updateCookie(id, data))
  ipcMain.handle('cookie:delete', (_e, id: string) => deleteCookie(id))

  ipcMain.handle('cookie:import', async (_e, name: string, profileId?: string) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'JSON files', extensions: ['json', 'txt'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const content = fs.readFileSync(result.filePaths[0], 'utf-8')
    return importCookiesJSON(content, name, profileId)
  })

  ipcMain.handle('cookie:export', async (_e, id: string) => {
    const json = exportCookiesJSON(id)
    if (!json) return false

    const result = await dialog.showSaveDialog({
      defaultPath: `cookies-${id}.json`,
      filters: [{ name: 'JSON files', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) return false
    fs.writeFileSync(result.filePath, json, 'utf-8')
    return true
  })
}
