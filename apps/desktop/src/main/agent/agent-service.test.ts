import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventType, type AGUIEvent } from '../../shared/agent/ag-ui-events'
import type { AgentToolContext } from './tools/types'

vi.mock('./model-provider', () => ({
  resolveAgentModel: () => 'fake-model'
}))

const streamImpl = vi.fn()

vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>()
  return {
    ...actual,
    ToolLoopAgent: vi.fn().mockImplementation(() => ({
      stream: (...args: unknown[]) => streamImpl(...args)
    }))
  }
})

// AgentService is a singleton instance module-level export; import after the
// mocks above so it's constructed against the mocked `ai`/model-provider.
const { AgentService } = await import('./agent-service')

function fakeStreamResult(parts: unknown[], content: unknown[], responseMessages: unknown[] = []) {
  return {
    stream: (async function* () {
      for (const p of parts) yield p
    })(),
    content: Promise.resolve(content),
    responseMessages: Promise.resolve(responseMessages)
  }
}

function makeCtx(): AgentToolContext {
  return { page: null, profileId: 'p1', workflowSnapshot: { nodes: [], edges: [] }, nodeDefinitions: [] }
}

function eventTypes(events: AGUIEvent[]): EventType[] {
  return events.map((e) => e.type)
}

describe('AgentService.run', () => {
  beforeEach(() => {
    streamImpl.mockReset()
  })

  it('runs to completion with no approvals needed', async () => {
    streamImpl.mockResolvedValueOnce(
      fakeStreamResult(
        [
          { type: 'text-start', id: 'm1' },
          { type: 'text-delta', id: 'm1', text: 'hi' },
          { type: 'text-end', id: 'm1' }
        ],
        [{ type: 'text', text: 'hi' }],
        [{ role: 'assistant', content: 'hi' }]
      )
    )

    const service = new AgentService()
    const events: AGUIEvent[] = []
    await service.run(
      { runId: 'r1', threadId: 't1', messages: [], toolContext: makeCtx() },
      (e) => events.push(e)
    )

    expect(eventTypes(events)).toEqual([
      EventType.RUN_STARTED,
      EventType.TEXT_MESSAGE_START,
      EventType.TEXT_MESSAGE_CONTENT,
      EventType.TEXT_MESSAGE_END,
      EventType.RUN_FINISHED
    ])
    expect(streamImpl).toHaveBeenCalledTimes(1)
    const finished = events.at(-1) as Extract<AGUIEvent, { type: EventType.RUN_FINISHED }>
    expect(finished.outcome).toEqual({ type: 'success' })
  })

  it('pauses for approval, resumes once resolved, and only calls stream() twice', async () => {
    const approvalRequestPart = {
      type: 'tool-approval-request',
      approvalId: 'appr-1',
      toolCall: { toolCallId: 't1', toolName: 'run_js', input: { code: '1+1' } },
      isAutomatic: false
    }
    streamImpl
      .mockResolvedValueOnce(
        fakeStreamResult(
          [approvalRequestPart],
          [approvalRequestPart],
          [{ role: 'assistant', content: [] }]
        )
      )
      .mockResolvedValueOnce(
        fakeStreamResult([{ type: 'text-start', id: 'm2' }], [{ type: 'text', text: 'done' }], [])
      )

    const service = new AgentService()
    const events: AGUIEvent[] = []
    const runPromise = service.run(
      { runId: 'r1', threadId: 't1', messages: [], toolContext: makeCtx() },
      (e) => events.push(e)
    )

    // Let the first stream() call + approval request resolve/emit before we respond.
    await vi.waitFor(() => {
      expect(events.some((e) => e.type === EventType.CUSTOM)).toBe(true)
    })
    expect(streamImpl).toHaveBeenCalledTimes(1)

    service.resolveApproval({ approvalId: 'appr-1', approved: true })
    await runPromise

    expect(streamImpl).toHaveBeenCalledTimes(2)
    expect(eventTypes(events)).toEqual([
      EventType.RUN_STARTED,
      EventType.CUSTOM,
      EventType.TEXT_MESSAGE_START,
      EventType.RUN_FINISHED
    ])

    // The resumed call must have received the approval-response tool message.
    const secondCallMessages = streamImpl.mock.calls[1][0].messages
    const toolMessage = secondCallMessages.at(-1)
    expect(toolMessage.role).toBe('tool')
    expect(toolMessage.content).toEqual([
      { type: 'tool-approval-response', approvalId: 'appr-1', approved: true, reason: undefined }
    ])
  })

  it('finishes as cancelled (not an error) when cancelled while waiting on approval', async () => {
    const approvalRequestPart = {
      type: 'tool-approval-request',
      approvalId: 'appr-1',
      toolCall: { toolCallId: 't1', toolName: 'run_js', input: {} },
      isAutomatic: false
    }
    streamImpl.mockResolvedValueOnce(
      fakeStreamResult([approvalRequestPart], [approvalRequestPart], [])
    )

    const service = new AgentService()
    const events: AGUIEvent[] = []
    const runPromise = service.run(
      { runId: 'r1', threadId: 't1', messages: [], toolContext: makeCtx() },
      (e) => events.push(e)
    )

    await vi.waitFor(() => {
      expect(events.some((e) => e.type === EventType.CUSTOM)).toBe(true)
    })

    service.cancel('r1')
    await runPromise

    const finished = events.at(-1) as Extract<AGUIEvent, { type: EventType.RUN_FINISHED }>
    expect(finished.type).toBe(EventType.RUN_FINISHED)
    expect(finished.outcome).toEqual({ type: 'cancelled' })
    expect(events.some((e) => e.type === EventType.RUN_ERROR)).toBe(false)
  })

  it('emits RUN_ERROR when the model call itself throws', async () => {
    streamImpl.mockRejectedValueOnce(new Error('provider unreachable'))

    const service = new AgentService()
    const events: AGUIEvent[] = []
    await service.run(
      { runId: 'r1', threadId: 't1', messages: [], toolContext: makeCtx() },
      (e) => events.push(e)
    )

    expect(eventTypes(events)).toEqual([EventType.RUN_STARTED, EventType.RUN_ERROR])
    const errorEvent = events.at(-1) as Extract<AGUIEvent, { type: EventType.RUN_ERROR }>
    expect(errorEvent.message).toBe('provider unreachable')
  })
})
