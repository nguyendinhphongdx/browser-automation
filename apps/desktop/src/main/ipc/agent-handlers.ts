import type { IpcMain, IpcMainInvokeEvent } from 'electron'
import type { ModelMessage } from 'ai'
import { getActiveBrowserContext } from '../browser/launcher'
import { NODE_DEFINITIONS } from '../automation/node-definitions'
import { agentService } from '../agent/agent-service'
import type { AgentToolContext } from '../agent/tools/types'
import type { WorkflowNode, WorkflowEdge } from '../../shared/types'
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
  workflowSnapshot: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }
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
    // One thread per profile is a reasonable default for now — nothing in
    // this app supports multiple concurrent conversations per profile yet.
    const threadId = payload.profileId

    const emit = (envelope: AgentEventEnvelope) => event.sender.send('agent:event', envelope)

    // Read-only: only use a browser that's already running for this
    // profile. Never auto-launch one here — if the agent needs a live page
    // and none exists, the browser-inspection tools report that explicitly
    // (see tools/get-page-html.ts etc.), and the agent can tell the user to
    // open a browser themselves rather than one silently appearing.
    let page = null
    const active = getActiveBrowserContext(payload.profileId)
    if (active) {
      const pages = active.context.pages().filter((p) => !p.isClosed())
      page = pages.length > 0 ? pages[pages.length - 1] : await active.context.newPage()
    }

    const toolContext: AgentToolContext = {
      page,
      profileId: payload.profileId,
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
