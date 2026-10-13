import type { IpcMain } from 'electron'
import { dialog } from 'electron'
import * as fs from 'fs'
import {
  getAllWorkflows, getWorkflowById, createWorkflow, updateWorkflow, deleteWorkflow,
  createWorkflowLog, updateWorkflowLog, getWorkflowLogs,
  exportWorkflow, importWorkflow, duplicateWorkflow,
  getWorkflowVersions, getWorkflowVersion, rollbackWorkflow, labelWorkflowVersion
} from '../services/workflow-service'
import {
  getAllCampaigns, getCampaignById, createCampaign, updateCampaign, deleteCampaign,
  duplicateCampaign, getCampaignRuns
} from '../services/campaign-service'
import { getProfileById, updateLastUsed } from '../services/profile-service'
import { acquireBrowserPage, getActiveBrowserContext } from '../browser/launcher'
import { startRecording, stopRecording, isRecording, getRecordedActions, actionsToWorkflow } from '../automation/recorder'
import { executeVisualWorkflow, executeCodeWorkflow, type ExecutionContext } from '../automation/engine'
import { NODE_DEFINITIONS, NODE_CATEGORIES } from '../automation/node-definitions'
import { executeCampaign, stopCampaign, pauseCampaign, resumeCampaign } from '../automation/campaign-engine'
import { DEFAULT_PROFILE_ID } from '../database/init'
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

    // Dùng default profile nếu không chọn
    const actualProfileId = profileId || DEFAULT_PROFILE_ID
    const profile = getProfileById(actualProfileId)
    if (!profile) throw new Error('Profile not found')

    const log = createWorkflowLog(workflowId, actualProfileId)

    const ctx: ExecutionContext = {
      page: null as any,
      context: null as any,
      profileId: actualProfileId,
      workflowId,
      workflowLogId: log.id,
      variables: {},
      logs: [],
      aborted: false,
      depth: 0
    }

    // Set up abort handler
    runningWorkflows.set(log.id, {
      abort: () => { ctx.aborted = true }
    })

    try {
      // acquireBrowserPage (browser/launcher.ts) tự phát hiện context chết
      // thật sự (browser process đã crash/bị đóng ngoài tầm kiểm soát) bằng
      // cách thử thao tác thật rồi relaunch nếu lỗi — KHÔNG dùng
      // context.pages() để "dò" (hàm đồng bộ chỉ đọc cache local, không hề
      // hỏi browser process còn sống hay không, nên không bắt được đúng
      // trường hợp này, từng khiến newPage() văng lỗi "Target page, context
      // or browser has been closed" thẳng ra ngoài không được xử lý).
      const { context, page } = await acquireBrowserPage(profile)
      updateLastUsed(actualProfileId)

      ctx.context = context
      ctx.page = page

      // Initialize variables from workflow
      for (const v of workflow.variables) {
        ctx.variables[v.name] = v.defaultValue
      }

      // Send status update to renderer
      const sender = event.sender
      sender.send('workflow:status', { logId: log.id, status: 'running', workflowId, profileId })

      // Node progress callbacks
      ctx.onNodeStart = (nodeId: string) => {
        sender.send('workflow:node-progress', { nodeId, status: 'running' })
      }
      ctx.onNodeDone = (nodeId: string) => {
        sender.send('workflow:node-progress', { nodeId, status: 'done' })
      }
      ctx.onNodeError = (nodeId: string, error: string) => {
        sender.send('workflow:node-progress', { nodeId, status: 'error', error })
      }

      // Execute based on mode
      if (workflow.mode === 'visual') {
        await executeVisualWorkflow(workflow, ctx)
      } else {
        await executeCodeWorkflow(workflow.code, ctx)
      }

      // Update log
      updateWorkflowLog(log.id, 'completed', JSON.stringify(ctx.logs))
      sender.send('workflow:status', { logId: log.id, status: 'completed', workflowId, profileId })

      // Giữ browser mở — không đóng
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

    let page
    try {
      const pages = active.context.pages()
      page = pages[pages.length - 1] || await active.context.newPage()
    } catch {
      // Context tưởng còn sống (có trong Map) nhưng process browser thật đã
      // chết — chỉ newPage() thật mới lộ ra, không phải context.pages() (xem
      // comment ở acquireBrowserPage, browser/launcher.ts). Báo lỗi rõ ràng
      // thay vì để lỗi nội bộ Playwright văng thẳng ra UI.
      throw new Error('Trình duyệt đã đóng ngoài tầm kiểm soát. Vui lòng mở lại browser trước khi ghi lại.')
    }

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

  // ── Campaign CRUD ─────────────────────────────
  ipcMain.handle('campaign:getAll', () => getAllCampaigns())
  ipcMain.handle('campaign:get', (_e, id: string) => getCampaignById(id))
  ipcMain.handle('campaign:create', (_e, data) => createCampaign(data))
  ipcMain.handle('campaign:update', (_e, id: string, data) => updateCampaign(id, data))
  ipcMain.handle('campaign:delete', (_e, id: string) => deleteCampaign(id))
  ipcMain.handle('campaign:duplicate', (_e, id: string) => duplicateCampaign(id))
  ipcMain.handle('campaign:getRuns', (_e, campaignId: string) => getCampaignRuns(campaignId))

  // ── Campaign Execution ───────────────────────
  ipcMain.handle('campaign:run', async (event, campaignId: string) => {
    const campaign = getCampaignById(campaignId)
    if (!campaign) throw new Error('Campaign not found')
    const runId = await executeCampaign(campaign, event.sender)
    return { runId }
  })

  ipcMain.handle('campaign:stop', (_e, campaignId: string) => {
    stopCampaign(campaignId)
    return { success: true }
  })

  ipcMain.handle('campaign:pause', (_e, campaignId: string) => {
    pauseCampaign(campaignId)
    return { success: true }
  })

  ipcMain.handle('campaign:resume', (_e, campaignId: string) => {
    resumeCampaign(campaignId)
    return { success: true }
  })

  // ── Workflow Versions ─────────────────────────

  ipcMain.handle('workflow:getVersions', (_e, workflowId: string) => {
    return getWorkflowVersions(workflowId)
  })

  ipcMain.handle('workflow:getVersion', (_e, versionId: string) => {
    return getWorkflowVersion(versionId)
  })

  ipcMain.handle('workflow:rollback', (_e, workflowId: string, versionId: string) => {
    const result = rollbackWorkflow(workflowId, versionId)
    if (!result) throw new Error('Rollback failed')
    return result
  })

  ipcMain.handle('workflow:labelVersion', (_e, versionId: string, label: string) => {
    labelWorkflowVersion(versionId, label)
    return { success: true }
  })
}
