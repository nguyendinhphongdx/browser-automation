import type { IpcMain } from 'electron'
import { dialog } from 'electron'
import * as fs from 'fs'
import {
  getAllWorkflows, getWorkflowById, createWorkflow, updateWorkflow, deleteWorkflow,
  createWorkflowLog, updateWorkflowLog, getWorkflowLogs,
  exportWorkflow, importWorkflow, duplicateWorkflow
} from '../services/workflow-service'
import { getProfileById, updateLastUsed } from '../services/profile-service'
import { launchBrowser, closeBrowser, getActiveBrowserContext } from '../browser/launcher'
import { startRecording, stopRecording, isRecording, getRecordedActions, actionsToWorkflow } from '../automation/recorder'
import { executeVisualWorkflow, executeCodeWorkflow, type ExecutionContext } from '../automation/engine'
import { NODE_DEFINITIONS, NODE_CATEGORIES } from '../automation/node-definitions'
import { chromium, firefox } from 'playwright-core'
import { detectInstalledBrowsers } from '../browser/detect'
import type { Workflow, BrowserProfile } from '../../shared/types'

// Track running workflows
const runningWorkflows = new Map<string, { abort: () => void }>()

export function registerAutomationHandlers(ipcMain: IpcMain) {
  // ── Workflow CRUD ─────────────────────────────
  ipcMain.handle('workflow:getAll', () => getAllWorkflows())
  ipcMain.handle('workflow:get', (_e, id: string) => getWorkflowById(id))
  ipcMain.handle('workflow:create', (_e, data) => createWorkflow(data))
  ipcMain.handle('workflow:update', (_e, id: string, data) => updateWorkflow(id, data))
  ipcMain.handle('workflow:delete', (_e, id: string) => deleteWorkflow(id))
  ipcMain.handle('workflow:getLogs', (_e, workflowId: string) => getWorkflowLogs(workflowId))

  ipcMain.handle('workflow:duplicate', (_e, id: string) => duplicateWorkflow(id))

  ipcMain.handle('workflow:export', async (_e, id: string) => {
    const json = exportWorkflow(id)
    if (!json) return false
    const result = await dialog.showSaveDialog({
      defaultPath: `workflow-${id}.json`,
      filters: [{ name: 'JSON files', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) return false
    fs.writeFileSync(result.filePath, json, 'utf-8')
    return true
  })

  ipcMain.handle('workflow:import', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'JSON files', extensions: ['json'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const content = fs.readFileSync(result.filePaths[0], 'utf-8')
    return importWorkflow(content)
  })

  // ── Node definitions (for UI) ──────────────────
  ipcMain.handle('automation:getNodeDefinitions', () => NODE_DEFINITIONS)
  ipcMain.handle('automation:getNodeCategories', () => NODE_CATEGORIES)

  // ── Execute workflow ──────────────────────────
  ipcMain.handle('workflow:run', async (event, workflowId: string, profileId: string) => {
    const workflow = getWorkflowById(workflowId)
    if (!workflow) throw new Error('Workflow not found')

    const profile = getProfileById(profileId)
    if (!profile) throw new Error('Profile not found')

    // Create log entry
    const log = createWorkflowLog(workflowId, profileId)

    // Launch browser for the profile
    await launchBrowser(profile)
    updateLastUsed(profileId)

    // Get the browser context - we need to get the page
    // For simplicity, re-launch and get context
    const browserType = profile.browserType === 'firefox' ? firefox : chromium
    const installed = detectInstalledBrowsers()
    const browserInfo = installed.find(b => b.type === profile.browserType)

    const ctx: ExecutionContext = {
      page: null as any, // Will be set after getting context
      context: null as any,
      variables: {},
      logs: [],
      aborted: false
    }

    // Set up abort handler
    runningWorkflows.set(log.id, {
      abort: () => { ctx.aborted = true }
    })

    try {
      // We need to get the active browser context
      // For now, launch a new dedicated context for automation
      const executablePath = profile.browserExecutablePath || browserInfo?.executablePath
      if (!executablePath) throw new Error('Browser not found')

      const browser = await browserType.launch({
        executablePath,
        headless: false
      })

      const context = await browser.newContext({
        userAgent: profile.fingerprint.userAgent,
        viewport: profile.fingerprint.screenResolution,
        locale: profile.fingerprint.locale,
        timezoneId: profile.fingerprint.timezone
      })

      const page = await context.newPage()
      ctx.page = page
      ctx.context = context

      // Initialize variables from workflow
      for (const v of workflow.variables) {
        ctx.variables[v.name] = v.defaultValue
      }

      // Send status update to renderer
      const sender = event.sender
      sender.send('workflow:status', { logId: log.id, status: 'running', workflowId, profileId })

      // Execute based on mode
      if (workflow.mode === 'visual') {
        await executeVisualWorkflow(workflow, ctx)
      } else {
        await executeCodeWorkflow(workflow.code, ctx)
      }

      // Update log
      updateWorkflowLog(log.id, 'completed', JSON.stringify(ctx.logs))
      sender.send('workflow:status', { logId: log.id, status: 'completed', workflowId, profileId })

      // Cleanup
      await context.close()
      await browser.close()

      return { logId: log.id, status: 'completed', logs: ctx.logs }
    } catch (err: any) {
      ctx.logs.push({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: err.message
      })
      updateWorkflowLog(log.id, 'error', JSON.stringify(ctx.logs))

      const sender = event.sender
      sender.send('workflow:status', { logId: log.id, status: 'error', workflowId, profileId, error: err.message })

      return { logId: log.id, status: 'error', logs: ctx.logs, error: err.message }
    } finally {
      runningWorkflows.delete(log.id)
    }
  })

  // ── Stop workflow ─────────────────────────────
  ipcMain.handle('workflow:stop', (_e, logId: string) => {
    const running = runningWorkflows.get(logId)
    if (running) {
      running.abort()
      runningWorkflows.delete(logId)
      return { success: true }
    }
    return { success: false }
  })

  // ── Recorder ────────────────────────────────────
  ipcMain.handle('recorder:start', async (_e, profileId: string) => {
    if (isRecording()) {
      throw new Error('Đang ghi lại rồi. Dừng trước khi bắt đầu lại.')
    }

    const active = getActiveBrowserContext(profileId)
    if (!active) {
      throw new Error('Trình duyệt chưa được khởi chạy. Vui lòng mở browser trước.')
    }

    const pages = active.context.pages()
    const page = pages[pages.length - 1] || await active.context.newPage()

    await startRecording(page)
    return { success: true }
  })

  ipcMain.handle('recorder:stop', () => {
    const actions = stopRecording()
    return { actions }
  })

  ipcMain.handle('recorder:status', () => {
    return { recording: isRecording(), actions: getRecordedActions() }
  })

  ipcMain.handle('recorder:toWorkflow', (_e, actions) => {
    return actionsToWorkflow(actions)
  })
}
