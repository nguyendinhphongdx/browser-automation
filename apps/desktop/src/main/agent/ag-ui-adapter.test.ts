import { describe, it, expect } from 'vitest'
import type { TextStreamPart, ToolSet } from 'ai'
import { adaptStreamPart } from './ag-ui-adapter'
import { EventType } from '../../shared/agent/ag-ui-events'

function part(p: Partial<TextStreamPart<ToolSet>> & { type: string }): TextStreamPart<ToolSet> {
  return p as TextStreamPart<ToolSet>
}

describe('adaptStreamPart', () => {
  it('maps text-start/delta/end to TEXT_MESSAGE_START/CONTENT/END', () => {
    expect(adaptStreamPart(part({ type: 'text-start', id: 'm1' }))).toEqual([
      { type: EventType.TEXT_MESSAGE_START, messageId: 'm1', role: 'assistant', timestamp: expect.any(Number) }
    ])
    expect(adaptStreamPart(part({ type: 'text-delta', id: 'm1', text: 'hi' }))).toEqual([
      { type: EventType.TEXT_MESSAGE_CONTENT, messageId: 'm1', delta: 'hi', timestamp: expect.any(Number) }
    ])
    expect(adaptStreamPart(part({ type: 'text-end', id: 'm1' }))).toEqual([
      { type: EventType.TEXT_MESSAGE_END, messageId: 'm1', timestamp: expect.any(Number) }
    ])
  })

  it('maps reasoning-start/delta/end to REASONING_MESSAGE_START/CONTENT/END', () => {
    expect(adaptStreamPart(part({ type: 'reasoning-start', id: 'r1' }))).toEqual([
      { type: EventType.REASONING_MESSAGE_START, messageId: 'r1', role: 'reasoning', timestamp: expect.any(Number) }
    ])
    expect(adaptStreamPart(part({ type: 'reasoning-delta', id: 'r1', text: 'thinking...' }))).toEqual([
      {
        type: EventType.REASONING_MESSAGE_CONTENT,
        messageId: 'r1',
        delta: 'thinking...',
        timestamp: expect.any(Number)
      }
    ])
    expect(adaptStreamPart(part({ type: 'reasoning-end', id: 'r1' }))).toEqual([
      { type: EventType.REASONING_MESSAGE_END, messageId: 'r1', timestamp: expect.any(Number) }
    ])
  })

  it('maps tool-input-start/delta/end to TOOL_CALL_START/ARGS/END', () => {
    expect(adaptStreamPart(part({ type: 'tool-input-start', id: 't1', toolName: 'run_js' }))).toEqual([
      { type: EventType.TOOL_CALL_START, toolCallId: 't1', toolCallName: 'run_js', timestamp: expect.any(Number) }
    ])
    expect(adaptStreamPart(part({ type: 'tool-input-delta', id: 't1', delta: '{"code":' }))).toEqual([
      { type: EventType.TOOL_CALL_ARGS, toolCallId: 't1', delta: '{"code":', timestamp: expect.any(Number) }
    ])
    expect(adaptStreamPart(part({ type: 'tool-input-end', id: 't1' }))).toEqual([
      { type: EventType.TOOL_CALL_END, toolCallId: 't1', timestamp: expect.any(Number) }
    ])
  })

  it('maps tool-result to TOOL_CALL_RESULT with JSON-stringified content', () => {
    const events = adaptStreamPart(
      part({ type: 'tool-result', toolCallId: 't1', output: { ok: true, url: 'https://x' } } as never)
    )
    expect(events).toEqual([
      {
        type: EventType.TOOL_CALL_RESULT,
        messageId: 'result-t1',
        toolCallId: 't1',
        content: JSON.stringify({ ok: true, url: 'https://x' }),
        role: 'tool',
        timestamp: expect.any(Number)
      }
    ])
  })

  it('maps tool-error to TOOL_CALL_RESULT carrying the error message', () => {
    const events = adaptStreamPart(
      part({ type: 'tool-error', toolCallId: 't1', error: new Error('boom') } as never)
    )
    expect(events).toEqual([
      {
        type: EventType.TOOL_CALL_RESULT,
        messageId: 'error-t1',
        toolCallId: 't1',
        content: JSON.stringify({ error: 'boom' }),
        role: 'tool',
        timestamp: expect.any(Number)
      }
    ])
  })

  it('maps tool-approval-request to a CUSTOM event carrying our AgentApprovalRequest shape', () => {
    const events = adaptStreamPart(
      part({
        type: 'tool-approval-request',
        approvalId: 'appr-1',
        reason: 'destructive action',
        toolCall: { toolCallId: 't1', toolName: 'run_js', input: { code: 'x' } }
      } as never)
    )
    expect(events).toEqual([
      {
        type: EventType.CUSTOM,
        name: 'tool-approval-request',
        value: {
          approvalId: 'appr-1',
          toolCallId: 't1',
          toolName: 'run_js',
          input: { code: 'x' },
          reason: 'destructive action'
        },
        timestamp: expect.any(Number)
      }
    ])
  })

  it('maps error to RUN_ERROR', () => {
    expect(adaptStreamPart(part({ type: 'error', error: new Error('network down') }))).toEqual([
      { type: EventType.RUN_ERROR, message: 'network down', timestamp: expect.any(Number) }
    ])
  })

  it('drops bookkeeping/unmapped parts (no AG-UI event emitted)', () => {
    const unmappedTypes = ['start', 'finish', 'start-step', 'finish-step', 'abort', 'tool-approval-response'] as const
    for (const type of unmappedTypes) {
      expect(adaptStreamPart(part({ type }))).toEqual([])
    }
  })
})
