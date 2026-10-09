import type { IpcMain, IpcMainInvokeEvent } from 'electron'
import type { ModelMessage } from 'ai'
import type { Page } from 'playwright-core'
import { getActiveBrowserContext } from '../browser/launcher'
import { getProfileById } from '../services/profile-service'
import { DEFAULT_PROFILE_ID } from '../database/init'
import { NODE_DEFINITIONS } from '../automation/node-definitions'
import { agentService } from '../agent/agent-service'
import type { AgentToolContext } from '../agent/tools/types'
import type { WorkflowNode, WorkflowEdge, WorkflowMode } from '../../shared/types'
import { EventType, type AgentEventEnvelope } from '../../shared/agent/ag-ui-events'

interface AgentRunPayload {
  // Generated on the renderer, not here — the renderer needs the id before
  // this handler's invoke() promise resolves (it only resolves once the
  // WHOLE run finishes; every event in between streams over `agent:event`),
  // so it can't learn the id from this call's return value in time to
  // correlate the very first event with the run it belongs to.
  runId: string
  profileId: string
  workflowId?: string
  workflowSnapshot: { nodes: WorkflowNode[]; edges: WorkflowEdge[]; mode?: WorkflowMode; code?: string }
  messages: ModelMessage[]
}

interface AgentRespondApprovalPayload {
  approvalId: string
  approved: boolean
  reason?: string
}

export function registerAgentHandlers(ipcMain: IpcMain) {
  ipcMain.handle('agent:run', async (event: IpcMainInvokeEvent, payload: AgentRunPayload) => {
    const { runId } = payload
    // '' from the profile dropdown means "Default browser" (same convention
    // automation-handlers.ts's workflow:run already follows) — not "no
    // profile selected". Resolve it here so every downstream use (thread id,
    // tool context, browser launch) agrees on the same real profile id.
    const profileId = payload.profileId || DEFAULT_PROFILE_ID
    // One thread per profile is a reasonable default for now — nothing in
    // this app supports multiple concurrent conversations per profile yet.
    const threadId = profileId

    const emit = (envelope: AgentEventEnvelope) => event.sender.send('agent:event', envelope)

    // Read-only — never launch a browser just because the agent is running.
    // The model decides that explicitly via the start_browser tool (see
    // tools/start-browser.ts); opening the chat panel or sending a message
    // should not have the side effect of popping a real browser window.
    if (!getProfileById(profileId)) {
      throw new Error(`Profile "${profileId}" không tồn tại`)
    }
    const active = getActiveBrowserContext(profileId)
    let page: Page | null = null
    if (active) {
      const pages = active.context.pages().filter((p) => !p.isClosed())
      page = pages[pages.length - 1] ?? null
    }

    const toolContext: AgentToolContext = {
      page,
      profileId,
      workflowId: payload.workflowId,
      workflowSnapshot: payload.workflowSnapshot,
      nodeDefinitions: NODE_DEFINITIONS,
      onScreenshot: (dataUrl) => {
        emit({
          runId,
          event: { type: EventType.CUSTOM, name: 'screenshot', value: { dataUrl }, timestamp: Date.now() }
        })
      }
    }

    await agentService.run(
      { runId, threadId, messages: payload.messages, toolContext },
      (aguiEvent) => emit({ runId, event: aguiEvent })
    )

    return { success: true }
  })

  ipcMain.handle('agent:respondApproval', (_e, payload: AgentRespondApprovalPayload) => {
    agentService.resolveApproval(payload)
    return { success: true }
  })

  ipcMain.handle('agent:cancel', (_e, payload: { runId: string }) => {
    agentService.cancel(payload.runId)
    return { success: true }
  })
}
