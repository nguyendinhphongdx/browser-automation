import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Page, BrowserContext } from 'playwright-core'
import type { Workflow } from '../../shared/types'

const { executeVisualWorkflowMock, executeCodeWorkflowMock } = vi.hoisted(() => ({
  executeVisualWorkflowMock: vi.fn().mockResolvedValue(undefined),
  executeCodeWorkflowMock: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('./engine', () => ({
  executeVisualWorkflow: executeVisualWorkflowMock,
  executeCodeWorkflow: executeCodeWorkflowMock,
}))

import { buildExecutionContext, runWorkflowOnce } from './run-workflow'

function makeWorkflow(overrides: Partial<Workflow> = {}): Workflow {
  return {
    id: 'wf-1',
    name: 'Test workflow',
    description: '',
    version: '1.0.0',
    mode: 'visual',
    nodes: [],
    edges: [],
    code: '',
    variables: [],
    status: 'ready',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

describe('run-workflow.ts', () => {
  beforeEach(() => {
    executeVisualWorkflowMock.mockClear()
    executeCodeWorkflowMock.mockClear()
  })

  it('buildExecutionContext builds a valid ExecutionContext from already-resolved page/context with no `any` casts', () => {
    const page = {} as Page
    const context = {} as BrowserContext
    const workflow = makeWorkflow({
      variables: [
        { name: 'a', type: 'string', defaultValue: '1' },
        { name: 'b', type: 'number', defaultValue: '2' },
      ],
    })

    const ctx = buildExecutionContext({ page, context, profileId: 'profile-1', workflow })

    expect(ctx.page).toBe(page)
    expect(ctx.context).toBe(context)
    expect(ctx.profileId).toBe('profile-1')
    expect(ctx.variables).toEqual({ a: '1', b: '2' })
    expect(ctx.logs).toEqual([])
    expect(ctx.aborted).toBe(false)
    expect(ctx.depth).toBe(0)
  })

  it('buildExecutionContext carries through optional metadata and depth', () => {
    const workflow = makeWorkflow()
    const ctx = buildExecutionContext({
      page: {} as Page,
      context: {} as BrowserContext,
      profileId: 'profile-1',
      workflow,
      workflowId: 'wf-1',
      workflowLogId: 'log-1',
      parentWorkflowId: 'parent-1',
      depth: 4,
    })

    expect(ctx.workflowId).toBe('wf-1')
    expect(ctx.workflowLogId).toBe('log-1')
    expect(ctx.parentWorkflowId).toBe('parent-1')
    expect(ctx.depth).toBe(4)
  })

  it('runWorkflowOnce dispatches to executeVisualWorkflow for visual-mode workflows', async () => {
    const workflow = makeWorkflow({ mode: 'visual' })
    const ctx = buildExecutionContext({ page: {} as Page, context: {} as BrowserContext, profileId: 'p1', workflow })

    await runWorkflowOnce(workflow, ctx)

    expect(executeVisualWorkflowMock).toHaveBeenCalledWith(workflow, ctx)
    expect(executeCodeWorkflowMock).not.toHaveBeenCalled()
  })

  it('runWorkflowOnce dispatches to executeCodeWorkflow only when mode is "code" AND code is non-empty', async () => {
    const workflow = makeWorkflow({ mode: 'code', code: 'log("hi")' })
    const ctx = buildExecutionContext({ page: {} as Page, context: {} as BrowserContext, profileId: 'p1', workflow })

    await runWorkflowOnce(workflow, ctx)

    expect(executeCodeWorkflowMock).toHaveBeenCalledWith('log("hi")', ctx)
    expect(executeVisualWorkflowMock).not.toHaveBeenCalled()
  })

  it('runWorkflowOnce falls back to visual dispatch when mode is "code" but code is empty', async () => {
    const workflow = makeWorkflow({ mode: 'code', code: '' })
    const ctx = buildExecutionContext({ page: {} as Page, context: {} as BrowserContext, profileId: 'p1', workflow })

    await runWorkflowOnce(workflow, ctx)

    expect(executeVisualWorkflowMock).toHaveBeenCalledTimes(1)
    expect(executeCodeWorkflowMock).not.toHaveBeenCalled()
  })
})
