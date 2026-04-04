import { ipcMain } from 'electron'
import { getEnabledCronSchedules, getChainSchedules, markTriggered } from '../services/schedule-service'
import { getWorkflowById } from '../services/workflow-service'
import { getCampaignById } from '../services/campaign-service'
import { getProfileById } from '../services/profile-service'
import { launchBrowser, getActiveBrowserContext, closeBrowser } from '../browser/launcher'
import { executeVisualWorkflow, executeCodeWorkflow, type ExecutionContext } from './engine'
import { createWorkflowLog, updateWorkflowLog } from '../services/workflow-service'
import { DEFAULT_PROFILE_ID } from '../database/init'
import type { Schedule } from '../../shared/types'

let intervalId: ReturnType<typeof setInterval> | null = null

export function startScheduler() {
  if (intervalId) return
  console.log('[Scheduler] Started — checking every 30s')

  // Check immediately then every 30s
  checkDueSchedules()
  intervalId = setInterval(checkDueSchedules, 30000)
}

export function stopScheduler() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
    console.log('[Scheduler] Stopped')
  }
}

async function checkDueSchedules() {
  const schedules = getEnabledCronSchedules()
  const now = new Date()

  for (const schedule of schedules) {
    if (!schedule.nextRunAt) continue
    const nextRun = new Date(schedule.nextRunAt)
    if (nextRun <= now) {
      console.log(`[Scheduler] Triggering: ${schedule.name}`)
      try {
        await triggerSchedule(schedule)
        markTriggered(schedule.id)
      } catch (err) {
        console.error(`[Scheduler] Error triggering ${schedule.name}:`, err)
      }
    }
  }
}

export async function triggerSchedule(schedule: Schedule): Promise<void> {
  if (schedule.targetType === 'workflow') {
    await runScheduledWorkflow(schedule)
  }
  // Campaign triggers would use executeCampaign — simplified for now
}

async function runScheduledWorkflow(schedule: Schedule) {
  const workflow = getWorkflowById(schedule.targetId)
  if (!workflow) throw new Error(`Workflow ${schedule.targetId} not found`)

  const profileId = schedule.profileId || DEFAULT_PROFILE_ID
  const profile = getProfileById(profileId)
  if (!profile) throw new Error(`Profile ${profileId} not found`)

  const log = createWorkflowLog(workflow.id, profileId)

  const ctx: ExecutionContext = {
    page: null as any,
    context: null as any,
    profileId,
    workflowId: workflow.id,
    workflowLogId: log.id,
    variables: {},
    logs: [],
    aborted: false,
    depth: 0,
  }

  let needsClose = false
  try {
    let active = getActiveBrowserContext(profileId)
    if (!active) {
      await launchBrowser(profile)
      active = getActiveBrowserContext(profileId)
      needsClose = true
    }
    if (!active) throw new Error('Cannot launch browser')

    ctx.context = active.context
    const pages = active.context.pages()
    ctx.page = pages.length > 0 ? pages[pages.length - 1] : await active.context.newPage()

    // Initialize workflow variables
    for (const v of workflow.variables) {
      ctx.variables[v.name] = v.defaultValue
    }

    if (workflow.mode === 'code' && workflow.code) {
      await executeCodeWorkflow(workflow.code, ctx)
    } else {
      await executeVisualWorkflow(workflow, ctx)
    }

    updateWorkflowLog(log.id, 'completed', JSON.stringify(ctx.logs))

    // Trigger chain schedules
    await processChains(workflow.id, 'completed')
  } catch (err: any) {
    updateWorkflowLog(log.id, 'error', JSON.stringify(ctx.logs))
    await processChains(workflow.id, 'error')
  } finally {
    if (needsClose) {
      await closeBrowser(profileId).catch(() => {})
    }
  }
}

/** After a workflow completes, check for chain triggers */
async function processChains(sourceId: string, status: string) {
  const chains = getChainSchedules(sourceId, status)
  for (const chain of chains) {
    try {
      console.log(`[Scheduler] Chain trigger: ${chain.name} (from ${sourceId} → ${status})`)
      await triggerSchedule(chain)
      markTriggered(chain.id)
    } catch (err) {
      console.error(`[Scheduler] Chain error:`, err)
    }
  }
}
