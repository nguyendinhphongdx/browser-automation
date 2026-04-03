import type { IpcMain } from 'electron'
import { app } from 'electron'
import path from 'path'
import {
  getSetting, setSetting, getAllSettings, setSettingsBatch
} from '../services/settings-service'
import {
  login, register, logout, checkAuth, testConnection, apiRequest
} from '../services/api-client'
import { aiChat } from '../services/ai-service'

export function registerSettingsHandlers(ipcMain: IpcMain) {
  // ── App info ─────────────────────────────────
  ipcMain.handle('app:getDbPath', () => {
    return path.join(app.getPath('userData'), 'browser-automation.db')
  })

  // ── Settings ──────────────────────────────────
  ipcMain.handle('settings:get', (_e, key: string) => getSetting(key))
  ipcMain.handle('settings:set', (_e, key: string, value: string) => setSetting(key, value))
  ipcMain.handle('settings:getAll', () => getAllSettings())
  ipcMain.handle('settings:setBatch', (_e, settings: Record<string, string>) => setSettingsBatch(settings))

  // ── Auth ──────────────────────────────────────
  ipcMain.handle('auth:login', async (_e, email: string, password: string) => login(email, password))
  ipcMain.handle('auth:register', async (_e, name: string, email: string, password: string) => register(name, email, password))
  ipcMain.handle('auth:logout', () => logout())
  ipcMain.handle('auth:check', async () => checkAuth())
  ipcMain.handle('auth:testConnection', async () => testConnection())

  // ── Generic API proxy (for renderer to call server) ──
  ipcMain.handle('api:request', async (_e, method: string, path: string, body?: any) => {
    return apiRequest(method, path, body)
  })

  // ── AI Chat (main process — không bị CORS) ──
  ipcMain.handle('ai:chat', async (_e, systemPrompt: string, messages: any[]) => {
    return aiChat(systemPrompt, messages)
  })
}
