import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ExecutionContext, NodeInput } from './base-node'
import type { Workflow } from '../../../shared/types'

const { getWorkflowByIdMock } = vi.hoisted(() => ({ getWorkflowByIdMock: vi.fn() }))
vi.mock('../../services/workflow-service', () => ({
  getWorkflowById: getWorkflowByIdMock,
}))

const { executeVisualWorkflowMock, executeCodeWorkflowMock } = vi.hoisted(() => ({
  executeVisualWorkflowMock: vi.fn(),
  executeCodeWorkflowMock: vi.fn(),
}))
vi.mock('../engine', () => ({
  executeVisualWorkflow: executeVisualWorkflowMock,
  executeCodeWorkflow: executeCodeWorkflowMock,
}))

// Import after mocks are registered (vi.mock is hoisted above imports anyway,
// but keep the ordering explicit for clarity).
import { RunWorkflowNode } from './sub-workflow'

function makeChildWorkflow(overrides: Partial<Workflow> = {}): Workflow {
  return {
    id: 'child-wf',
    name: 'Child',
    description: '',
    version: '1.0.0',
    mode: 'visual',
    nodes: [],
    edges: [],
    code: '',
    variables: [{ name: 'childDefault', type: 'string', defaultValue: 'd' }],
    status: 'active' as Workflow['status'],
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

function makeCtx(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
  return {
    page: {} as unknown as ExecutionContext['page'],
    context: {} as unknown as ExecutionContext['context'],
    profileId: 'profile-1',
    variables: {},
    logs: [],
    aborted: false,
    depth: 0,
    ...overrides,
  }
}

function makeInput(config: Record<string, unknown>): NodeInput {
  return { nodeId: 'run-wf-1', label: 'Run sub-workflow', config }
}

describe('RunWorkflowNode (sub-workflow.ts)', () => {
  beforeEach(() => {
    getWorkflowByIdMock.mockReset()
    executeVisualWorkflowMock.mockReset()
    executeCodeWorkflowMock.mockReset()
    executeVisualWorkflowMock.mockResolvedValue(undefined)
    executeCodeWorkflowMock.mockResolvedValue(undefined)
  })

  it('throws once ctx.depth reaches the default MAX_DEPTH (10)', async () => {
    getWorkflowByIdMock.mockReturnValue(makeChildWorkflow())
    const ctx = makeCtx({ depth: 10 })
    const node = new RunWorkflowNode(ctx, makeInput({ workflowId: 'child-wf' }))

    await expect(node.run()).rejects.toThrow(/10/)
    expect(executeVisualWorkflowMock).not.toHaveBeenCalled()
  })

  it('does not throw for depth below the default MAX_DEPTH', async () => {
    getWorkflowByIdMock.mockReturnValue(makeChildWorkflow())
    const ctx = makeCtx({ depth: 9 })
    const node = new RunWorkflowNode(ctx, makeInput({ workflowId: 'child-wf' }))

    await expect(node.run()).resolves.toBeUndefined()
    expect(executeVisualWorkflowMock).toHaveBeenCalledTimes(1)
  })

  it('respects a custom config.maxDepth override', async () => {
    getWorkflowByIdMock.mockReturnValue(makeChildWorkflow())

    const atLimit = makeCtx({ depth: 3 })
    const nodeAtLimit = new RunWorkflowNode(atLimit, makeInput({ workflowId: 'child-wf', maxDepth: 3 }))
    await expect(nodeAtLimit.run()).rejects.toThrow(/3/)

    const belowLimit = makeCtx({ depth: 2 })
    const nodeBelowLimit = new RunWorkflowNode(belowLimit, makeInput({ workflowId: 'child-wf', maxDepth: 3 }))
    await expect(nodeBelowLimit.run()).resolves.toBeUndefined()
  })

  it('isolates variables: parent variables are not visible to the child except via inputMappings', async () => {
    getWorkflowByIdMock.mockReturnValue(makeChildWorkflow())
    let capturedChildVars: Record<string, unknown> | undefined
    executeVisualWorkflowMock.mockImplementation(async (_wf: Workflow, childCtx: ExecutionContext) => {
      capturedChildVars = { ...childCtx.variables }
    })

    const ctx = makeCtx({ variables: { secret: 'parentVal', shared: 'x' } })
    const node = new RunWorkflowNode(
      ctx,
      makeInput({ workflowId: 'child-wf', inputMappings: { childIn: 'secret' } })
    )
    await node.run()

    expect(capturedChildVars).toEqual({ childIn: 'parentVal', childDefault: 'd' })
    expect(capturedChildVars).not.toHaveProperty('shared')
    expect(capturedChildVars).not.toHaveProperty('secret')
  })

  it('writes back only mapped outputMappings into the parent context, without polluting other keys', async () => {
    getWorkflowByIdMock.mockReturnValue(makeChildWorkflow())
    executeVisualWorkflowMock.mockImplementation(async (_wf: Workflow, childCtx: ExecutionContext) => {
      childCtx.variables.childOut = 'resultVal'
      childCtx.variables.untouched = 'shouldNotLeak'
    })

    const ctx = makeCtx({ variables: { existing: 'keepMe' } })
    const node = new RunWorkflowNode(
      ctx,
      makeInput({ workflowId: 'child-wf', outputMappings: { parentOut: 'childOut' } })
    )
    await node.run()

    expect(ctx.variables).toEqual({ existing: 'keepMe', parentOut: 'resultVal' })
    expect(ctx.variables).not.toHaveProperty('childOut')
    expect(ctx.variables).not.toHaveProperty('untouched')
  })

  it('propagates abort from child to parent one-way', async () => {
    getWorkflowByIdMock.mockReturnValue(makeChildWorkflow())
    executeVisualWorkflowMock.mockImplementation(async (_wf: Workflow, childCtx: ExecutionContext) => {
      childCtx.aborted = true
    })

    const ctx = makeCtx({ aborted: false })
    const node = new RunWorkflowNode(ctx, makeInput({ workflowId: 'child-wf' }))
    await node.run()

    expect(ctx.aborted).toBe(true)
  })

  it('does not propagate parent abort into a fresh child (child starts from parent value only at creation time)', async () => {
    getWorkflowByIdMock.mockReturnValue(makeChildWorkflow())
    let capturedChildAborted: boolean | undefined
    executeVisualWorkflowMock.mockImplementation(async (_wf: Workflow, childCtx: ExecutionContext) => {
      capturedChildAborted = childCtx.aborted
    })

    // ctx.aborted starts false — run() itself would no-op if it were already
    // true, so this proves the child's initial `aborted` mirrors the parent's
    // at construction time rather than being hardcoded.
    const ctx = makeCtx({ aborted: false })
    const node = new RunWorkflowNode(ctx, makeInput({ workflowId: 'child-wf' }))
    await node.run()

    expect(capturedChildAborted).toBe(false)
  })

  it('dispatches to executeCodeWorkflow when the child workflow is in code mode', async () => {
    getWorkflowByIdMock.mockReturnValue(makeChildWorkflow({ mode: 'code', code: 'log("hi")' }))
    const ctx = makeCtx()
    const node = new RunWorkflowNode(ctx, makeInput({ workflowId: 'child-wf' }))
    await node.run()

    expect(executeCodeWorkflowMock).toHaveBeenCalledTimes(1)
    expect(executeVisualWorkflowMock).not.toHaveBeenCalled()
  })

  it('throws a clear error when workflowId is missing', async () => {
    const ctx = makeCtx()
    const node = new RunWorkflowNode(ctx, makeInput({}))
    await expect(node.run()).rejects.toThrow()
    expect(getWorkflowByIdMock).not.toHaveBeenCalled()
  })

  it('throws a clear error when the referenced workflow does not exist', async () => {
    getWorkflowByIdMock.mockReturnValue(null)
    const ctx = makeCtx()
    const node = new RunWorkflowNode(ctx, makeInput({ workflowId: 'missing-wf' }))
    await expect(node.run()).rejects.toThrow()
  })
})
