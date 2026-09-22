import { describe, it, expect, vi, afterEach } from 'vitest'
import { executeVisualWorkflow } from './engine'
import type { ExecutionContext } from './nodes/base-node'
import type { Workflow, WorkflowNode, WorkflowEdge, WorkflowNodeData } from '../../shared/types'

function node(id: string, type: string, config: Record<string, unknown> = {}, data: Partial<WorkflowNodeData> = {}): WorkflowNode {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data: { label: id, category: 'flow', config, ...data },
  }
}

function edge(id: string, source: string, target: string, sourceHandle?: string): WorkflowEdge {
  return { id, source, target, sourceHandle }
}

function makeWorkflow(nodes: WorkflowNode[], edges: WorkflowEdge[]): Workflow {
  return {
    id: 'wf-1',
    name: 'Parallel test workflow',
    description: '',
    version: '1.0.0',
    mode: 'visual',
    nodes,
    edges,
    code: '',
    variables: [],
    status: 'ready',
    createdAt: '',
    updatedAt: '',
  }
}

function makeCtx(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
  return {
    page: { isClosed: () => true } as unknown as ExecutionContext['page'],
    context: {} as unknown as ExecutionContext['context'],
    profileId: 'profile-1',
    variables: {},
    logs: [],
    aborted: false,
    depth: 0,
    ...overrides,
  }
}

/** Fork -> [branchA, branchB] -> Join -> after1 */
function buildParallelWorkflow(opts: {
  mergeStrategy: 'merge' | 'collect' | 'last-wins'
  joinTimeout?: number
  branchA: WorkflowNode
  branchB: WorkflowNode
}): Workflow {
  const nodes: WorkflowNode[] = [
    node('fork1', 'parallel-fork', { branches: 2 }),
    opts.branchA,
    opts.branchB,
    node('join1', 'parallel-join', { mode: 'all', mergeStrategy: opts.mergeStrategy, timeout: opts.joinTimeout ?? 60000 }),
    node('after1', 'set-variable', { variable: 'done', value: 'yes' }),
  ]
  const edges: WorkflowEdge[] = [
    edge('e1', 'fork1', opts.branchA.id),
    edge('e2', 'fork1', opts.branchB.id),
    edge('e3', opts.branchA.id, 'join1'),
    edge('e4', opts.branchB.id, 'join1'),
    edge('e5', 'join1', 'after1'),
  ]
  return makeWorkflow(nodes, edges)
}

describe('executeVisualWorkflow — parallel fork/join', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('merge strategy: shallow-merges distinct variables from all branches', async () => {
    const branchA = node('a1', 'set-variable', { variable: 'varA', value: 'fromA' })
    const branchB = node('b1', 'set-variable', { variable: 'varB', value: 'fromB' })
    const workflow = buildParallelWorkflow({ mergeStrategy: 'merge', branchA, branchB })
    const ctx = makeCtx()

    await executeVisualWorkflow(workflow, ctx)

    expect(ctx.variables.varA).toBe('fromA')
    expect(ctx.variables.varB).toBe('fromB')
    expect(ctx.variables.done).toBe('yes') // execution continued past the join
  })

  it('collect strategy: differing values for the same key become an array', async () => {
    const branchA = node('a1', 'set-variable', { variable: 'x', value: 'fromA' })
    const branchB = node('b1', 'set-variable', { variable: 'x', value: 'fromB' })
    const workflow = buildParallelWorkflow({ mergeStrategy: 'collect', branchA, branchB })
    const ctx = makeCtx()

    await executeVisualWorkflow(workflow, ctx)

    expect(Array.isArray(ctx.variables.x)).toBe(true)
    expect(new Set(ctx.variables.x)).toEqual(new Set(['fromA', 'fromB']))
    expect(ctx.variables.x).toHaveLength(2)
    expect(ctx.variables.done).toBe('yes')
  })

  it('last-wins strategy: the last branch to finish overwrites earlier ones', async () => {
    vi.useFakeTimers()
    // Branch A finishes immediately; branch B finishes after a delay, so it
    // is guaranteed to be the "last" branch to complete.
    const branchA = node('a1', 'set-variable', { variable: 'x', value: 'fromA' })
    const branchB = node('b1', 'delay', { ms: 100 })
    // second node in branch B, after the delay, actually sets the variable
    const branchB2 = node('b2', 'set-variable', { variable: 'x', value: 'fromB' })

    const nodes: WorkflowNode[] = [
      node('fork1', 'parallel-fork', { branches: 2 }),
      branchA,
      branchB,
      branchB2,
      node('join1', 'parallel-join', { mode: 'all', mergeStrategy: 'last-wins', timeout: 60000 }),
      node('after1', 'set-variable', { variable: 'done', value: 'yes' }),
    ]
    const edges: WorkflowEdge[] = [
      edge('e1', 'fork1', branchA.id),
      edge('e2', 'fork1', branchB.id),
      edge('e3', branchA.id, 'join1'),
      edge('e4', branchB.id, branchB2.id),
      edge('e5', branchB2.id, 'join1'),
      edge('e6', 'join1', 'after1'),
    ]
    const workflow = makeWorkflow(nodes, edges)
    const ctx = makeCtx()

    const promise = executeVisualWorkflow(workflow, ctx)
    await vi.runAllTimersAsync()
    await promise

    expect(ctx.variables.x).toBe('fromB')
    expect(ctx.variables.done).toBe('yes')
  })

  it('races a slow-timeout join: branches that outlive the join timeout are abandoned without blocking the workflow', async () => {
    vi.useFakeTimers()
    const branchA = node('a1', 'delay', { ms: 100000 })
    const branchB = node('b1', 'delay', { ms: 100000 })
    const workflow = buildParallelWorkflow({ mergeStrategy: 'merge', joinTimeout: 50, branchA, branchB })
    const ctx = makeCtx()

    const promise = executeVisualWorkflow(workflow, ctx)
    await vi.runAllTimersAsync()
    await promise

    // Workflow continued past the join despite branches never finishing in time.
    expect(ctx.variables.done).toBe('yes')
    expect(ctx.logs.some((l) => l.level === 'warn' && l.message.includes('timed out'))).toBe(true)
  })
})
