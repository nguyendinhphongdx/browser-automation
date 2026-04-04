import type { WebContents } from 'electron'
import type {
  Campaign, CampaignProfileResult, CampaignExecution,
  Workflow, BrowserProfile, LogEntry
} from '../../shared/types'
import { getProfileById, updateLastUsed } from '../services/profile-service'
import { getWorkflowById } from '../services/workflow-service'
import { checkQuota, filterProfiles, topologicalSort, pickABVariant } from '../services/quota-service'
import type { ProfileSelectionRule, ABTestVariant, WorkflowDependency, QuotaConfig } from '../services/quota-service'
import { createCampaignRun, updateCampaignRun, updateCampaign } from '../services/campaign-service'
import { launchBrowser, closeBrowser, getActiveBrowserContext } from '../browser/launcher'
import { executeVisualWorkflow, executeCodeWorkflow, type ExecutionContext } from './engine'

interface RunningCampaign {
  aborted: boolean
  paused: boolean
}

const runningCampaigns = new Map<string, RunningCampaign>()

function randomDelay(range: { min: number; max: number }): number {
  return range.min + Math.floor(Math.random() * (range.max - range.min))
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Chạy 1 workflow trên 1 profile */
async function runSingleTask(
  profile: BrowserProfile,
  workflow: Workflow,
  sender: WebContents,
  campaignState: RunningCampaign,
  result: CampaignProfileResult
): Promise<void> {
  result.status = 'running'
  result.startedAt = new Date().toISOString()
  sender.send('campaign:profile-progress', { ...result })

  // Launch browser
  let active = getActiveBrowserContext(profile.id)
  if (active) {
    try { active.context.pages() } catch {
      await closeBrowser(profile.id).catch(() => {})
      active = null
    }
  }
  if (!active) {
    await launchBrowser(profile)
    active = getActiveBrowserContext(profile.id)
  }
  if (!active) throw new Error('Không thể khởi chạy browser')
  updateLastUsed(profile.id)

  const ctx: ExecutionContext = {
    page: null as any,
    context: active.context,
    profileId: profile.id,
    workflowId: workflow.id,
    variables: {},
    logs: [],
    aborted: false,
    depth: 0,
    onNodeStart: (nodeId) => {
      sender.send('campaign:node-progress', { profileId: profile.id, workflowId: workflow.id, nodeId, status: 'running' })
    },
    onNodeDone: (nodeId) => {
      sender.send('campaign:node-progress', { profileId: profile.id, workflowId: workflow.id, nodeId, status: 'done' })
    },
    onNodeError: (nodeId, error) => {
      sender.send('campaign:node-progress', { profileId: profile.id, workflowId: workflow.id, nodeId, status: 'error', error })
    },
  }

  const pages = active.context.pages().filter(p => !p.isClosed())
  ctx.page = pages[pages.length - 1] || await active.context.newPage()

  // Init variables
  for (const v of workflow.variables) {
    ctx.variables[v.name] = v.defaultValue
  }

  // Execute
  if (workflow.mode === 'visual') {
    await executeVisualWorkflow(workflow, ctx)
  } else {
    await executeCodeWorkflow(workflow.code, ctx)
  }

  result.logs = ctx.logs
  result.status = 'completed'
  result.finishedAt = new Date().toISOString()
  sender.send('campaign:profile-progress', { ...result })
}

/** Chạy toàn bộ campaign */
export async function executeCampaign(
  campaign: Campaign,
  sender: WebContents
): Promise<string> {
  const exec = campaign.execution
  const run = createCampaignRun(campaign.id)

  const state: RunningCampaign = { aborted: false, paused: false }
  runningCampaigns.set(campaign.id, state)

  // Update campaign status
  updateCampaign(campaign.id, { status: 'running' })
  sender.send('campaign:status', { campaignId: campaign.id, status: 'running', runId: run.id })

  // Resolve profiles & workflows
  let profiles = campaign.profileIds
    .map(id => getProfileById(id))
    .filter((p): p is BrowserProfile => p !== null)

  const allWorkflows = campaign.workflowIds
    .map(id => getWorkflowById(id))
    .filter((w): w is Workflow => w !== null)

  if (profiles.length === 0 || allWorkflows.length === 0) {
    updateCampaign(campaign.id, { status: 'error' })
    throw new Error('Cần ít nhất 1 profile và 1 workflow')
  }

  // ── Advanced: Profile selection rules ──
  if (exec.profileSelectionRules && exec.profileSelectionRules.length > 0) {
    profiles = filterProfiles(
      profiles.map(p => ({ id: p.id, tags: p.tags, proxyId: p.proxyId, lastUsed: p.lastUsed })),
      exec.profileSelectionRules as ProfileSelectionRule[]
    ).map(f => profiles.find(p => p.id === f.id)!).filter(Boolean)
  }

  // ── Advanced: Dependency ordering ──
  let orderedWorkflowIds = allWorkflows.map(w => w.id)
  if (exec.dependencies && exec.dependencies.length > 0) {
    try {
      orderedWorkflowIds = topologicalSort(orderedWorkflowIds, exec.dependencies as WorkflowDependency[])
    } catch (err: any) {
      throw new Error(`Campaign dependency error: ${err.message}`)
    }
  }

  // Order profiles
  const orderedProfiles = exec.profileOrder === 'random' ? shuffleArray(profiles) : profiles

  // Build task list: each profile × workflows
  interface Task { profile: BrowserProfile; workflow: Workflow; result: CampaignProfileResult; abVariant?: string }
  const tasks: Task[] = []

  for (const profile of orderedProfiles) {
    // ── Advanced: Quota check ──
    if (exec.quotaConfig) {
      const quota = checkQuota(profile.id, exec.quotaConfig as QuotaConfig)
      if (!quota.allowed) {
        // Add skipped result
        tasks.push({
          profile,
          workflow: allWorkflows[0],
          result: {
            profileId: profile.id,
            profileName: profile.name,
            workflowId: allWorkflows[0].id,
            workflowName: allWorkflows[0].name,
            status: 'skipped',
            error: quota.reason,
            logs: [],
          }
        })
        continue
      }
    }

    // Select workflows for this profile
    let wfs: Workflow[]

    // ── Advanced: A/B test variant selection ──
    if (exec.abTestVariants && exec.abTestVariants.length > 0) {
      const variant = pickABVariant(exec.abTestVariants as ABTestVariant[])
      const variantWf = allWorkflows.find(w => w.id === variant.workflowId)
      wfs = variantWf ? [variantWf] : allWorkflows.slice(0, 1)
    } else if (exec.workflowOrder === 'random') {
      wfs = [allWorkflows[Math.floor(Math.random() * allWorkflows.length)]]
    } else if (exec.workflowOrder === 'shuffle') {
      wfs = shuffleArray(allWorkflows)
    } else {
      // Sequential — respect dependency order
      wfs = orderedWorkflowIds.map(id => allWorkflows.find(w => w.id === id)!).filter(Boolean)
    }

    for (const wf of wfs) {
      tasks.push({
        profile,
        workflow: wf,
        result: {
          profileId: profile.id,
          profileName: profile.name,
          workflowId: wf.id,
          workflowName: wf.name,
          status: 'pending',
          logs: [],
        }
      })
    }
  }

  // Send initial results
  const allResults = tasks.map(t => t.result)
  sender.send('campaign:results', allResults)

  try {
    const totalRepeats = exec.repeatCount + 1

    for (let repeat = 0; repeat < totalRepeats && !state.aborted; repeat++) {
      if (repeat > 0) {
        // Reset results for new repeat
        for (const t of tasks) {
          t.result.status = 'pending'
          t.result.logs = []
          t.result.startedAt = undefined
          t.result.finishedAt = undefined
          t.result.error = undefined
        }
        sender.send('campaign:results', allResults)

        const delay = randomDelay(exec.repeatDelay)
        await sleep(delay, state)
      }

      if (exec.mode === 'parallel') {
        await runParallel(tasks, exec, sender, state)
      } else {
        await runSequential(tasks, exec, sender, state)
      }
    }

    // Final status
    const hasError = allResults.some(r => r.status === 'error')
    const finalStatus = state.aborted ? 'error' : hasError ? 'error' : 'completed'
    updateCampaignRun(run.id, finalStatus, allResults)
    updateCampaign(campaign.id, { status: finalStatus })
    sender.send('campaign:status', { campaignId: campaign.id, status: finalStatus, runId: run.id })

    return run.id
  } catch (err: any) {
    updateCampaignRun(run.id, 'error', allResults)
    updateCampaign(campaign.id, { status: 'error' })
    sender.send('campaign:status', { campaignId: campaign.id, status: 'error', runId: run.id, error: err.message })
    throw err
  } finally {
    runningCampaigns.delete(campaign.id)
  }
}

async function runSequential(
  tasks: { profile: BrowserProfile; workflow: Workflow; result: CampaignProfileResult }[],
  exec: CampaignExecution,
  sender: WebContents,
  state: RunningCampaign
) {
  for (let i = 0; i < tasks.length && !state.aborted; i++) {
    // Wait while paused
    while (state.paused && !state.aborted) {
      await new Promise(r => setTimeout(r, 500))
    }

    const task = tasks[i]
    await runTaskWithRetry(task, exec, sender, state)

    // Stop on error
    if (exec.stopOnError && task.result.status === 'error') break

    // Delay between profiles
    if (i < tasks.length - 1 && !state.aborted) {
      const delay = randomDelay(exec.delayBetweenProfiles)
      await sleep(delay, state)
    }
  }
}

async function runParallel(
  tasks: { profile: BrowserProfile; workflow: Workflow; result: CampaignProfileResult }[],
  exec: CampaignExecution,
  sender: WebContents,
  state: RunningCampaign
) {
  const maxConcurrent = exec.maxConcurrent || 3
  let currentMax = exec.warmUp ? Math.min(exec.warmUpStep || 1, maxConcurrent) : maxConcurrent

  // Stagger start: mỗi task bắt đầu cách nhau 1 khoảng delay
  let startIndex = 0

  async function worker() {
    while (startIndex < tasks.length && !state.aborted) {
      while (state.paused && !state.aborted) {
        await new Promise(r => setTimeout(r, 500))
      }

      const taskIndex = startIndex++
      const task = tasks[taskIndex]

      try {
        await runTaskWithRetry(task, exec, sender, state)
      } catch {}

      if (exec.stopOnError && task.result.status === 'error') {
        state.aborted = true
      }

      // Warm-up: increase concurrency after each completed task
      if (exec.warmUp && currentMax < maxConcurrent) {
        currentMax = Math.min(currentMax + (exec.warmUpStep || 1), maxConcurrent)
      }
    }
  }

  // Launch workers with stagger delay
  const workers: Promise<void>[] = []
  for (let i = 0; i < Math.min(currentMax, tasks.length); i++) {
    if (i > 0) {
      await sleep(randomDelay(exec.delayBetweenProfiles), state)
    }
    workers.push(worker())
  }

  await Promise.all(workers)
}

async function runTaskWithRetry(
  task: { profile: BrowserProfile; workflow: Workflow; result: CampaignProfileResult },
  exec: CampaignExecution,
  sender: WebContents,
  state: RunningCampaign
) {
  const maxRetries = exec.retryOnError || 0

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (state.aborted) {
      task.result.status = 'skipped'
      sender.send('campaign:profile-progress', { ...task.result })
      return
    }

    try {
      await runSingleTask(task.profile, task.workflow, sender, state, task.result)
      return // Success
    } catch (err: any) {
      task.result.error = err.message
      if (attempt < maxRetries) {
        task.result.status = 'pending'
        sender.send('campaign:profile-progress', { ...task.result })
        await new Promise(r => setTimeout(r, 2000)) // Wait before retry
      } else {
        task.result.status = 'error'
        task.result.finishedAt = new Date().toISOString()
        sender.send('campaign:profile-progress', { ...task.result })
      }
    }
  }
}

function sleep(ms: number, state: RunningCampaign): Promise<void> {
  return new Promise(resolve => {
    const start = Date.now()
    const check = () => {
      if (state.aborted || Date.now() - start >= ms) resolve()
      else setTimeout(check, 100)
    }
    check()
  })
}

export function stopCampaign(campaignId: string) {
  const state = runningCampaigns.get(campaignId)
  if (state) state.aborted = true
}

export function pauseCampaign(campaignId: string) {
  const state = runningCampaigns.get(campaignId)
  if (state) state.paused = true
}

export function resumeCampaign(campaignId: string) {
  const state = runningCampaigns.get(campaignId)
  if (state) state.paused = false
}

export function isCampaignRunning(campaignId: string): boolean {
  return runningCampaigns.has(campaignId)
}
