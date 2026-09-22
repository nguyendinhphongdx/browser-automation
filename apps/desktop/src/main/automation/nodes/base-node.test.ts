import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { BaseNode } from './base-node'
import type { ExecutionContext, NodeInput } from './base-node'
import type { NodeRetryConfig } from '../../../shared/types'

/** Minimal concrete BaseNode fixture that fails N times then succeeds. */
class FlakyNode extends BaseNode {
  attempts = 0
  constructor(ctx: ExecutionContext, input: NodeInput, private failCount: number) {
    super(ctx, input)
  }
  protected async execute(): Promise<void> {
    this.attempts++
    if (this.attempts <= this.failCount) {
      throw new Error(`fail attempt ${this.attempts}`)
    }
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

function makeInput(retryConfig?: NodeRetryConfig): NodeInput {
  return {
    nodeId: 'node-1',
    label: 'Flaky node',
    config: retryConfig ? { _retryConfig: retryConfig } : {},
  }
}

describe('BaseNode.run() retry/backoff', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('succeeds without retrying when execute() succeeds first try', async () => {
    const ctx = makeCtx()
    const node = new FlakyNode(ctx, makeInput({ maxRetries: 3, backoffStrategy: 'fixed', backoffBaseMs: 100, backoffMaxMs: 1000 }), 0)

    const promise = node.run()
    await vi.runAllTimersAsync()
    await expect(promise).resolves.toBeUndefined()
    expect(node.attempts).toBe(1)
  })

  it('retries and eventually succeeds after N failures, without throwing', async () => {
    const ctx = makeCtx()
    const retryConfig: NodeRetryConfig = { maxRetries: 3, backoffStrategy: 'fixed', backoffBaseMs: 50, backoffMaxMs: 1000 }
    const node = new FlakyNode(ctx, makeInput(retryConfig), 2)

    const promise = node.run()
    await vi.runAllTimersAsync()
    await expect(promise).resolves.toBeUndefined()
    expect(node.attempts).toBe(3) // 1 initial + 2 retries
  })

  it('stops retrying after maxRetries and rejects', async () => {
    const ctx = makeCtx()
    const retryConfig: NodeRetryConfig = { maxRetries: 2, backoffStrategy: 'fixed', backoffBaseMs: 10, backoffMaxMs: 1000 }
    const node = new FlakyNode(ctx, makeInput(retryConfig), 10) // always fails

    const promise = node.run()
    // Attach the rejection assertion before advancing timers, so the
    // rejection is never briefly "unhandled" between settling and assertion.
    const assertion = expect(promise).rejects.toThrow('fail attempt 3')
    await vi.runAllTimersAsync()
    await assertion
    expect(node.attempts).toBe(3) // 1 initial + 2 retries, then give up
  })

  it('calls onNodeRetry with correct attempt numbers', async () => {
    const onNodeRetry = vi.fn()
    const ctx = makeCtx({ onNodeRetry })
    const retryConfig: NodeRetryConfig = { maxRetries: 3, backoffStrategy: 'fixed', backoffBaseMs: 10, backoffMaxMs: 1000 }
    const node = new FlakyNode(ctx, makeInput(retryConfig), 2)

    const promise = node.run()
    await vi.runAllTimersAsync()
    await promise

    expect(onNodeRetry).toHaveBeenCalledTimes(2)
    expect(onNodeRetry).toHaveBeenNthCalledWith(1, 'node-1', 1, 3)
    expect(onNodeRetry).toHaveBeenNthCalledWith(2, 'node-1', 2, 3)
  })

  it('does not retry (and does not call onNodeRetry) when maxRetries is 0', async () => {
    const onNodeRetry = vi.fn()
    const ctx = makeCtx({ onNodeRetry })
    const node = new FlakyNode(ctx, makeInput(), 5) // no retry config at all

    const promise = node.run()
    const assertion = expect(promise).rejects.toThrow('fail attempt 1')
    await vi.runAllTimersAsync()
    await assertion
    expect(node.attempts).toBe(1)
    expect(onNodeRetry).not.toHaveBeenCalled()
  })

  it('computes fixed backoff delay as a constant', async () => {
    const ctx = makeCtx()
    const retryConfig: NodeRetryConfig = { maxRetries: 3, backoffStrategy: 'fixed', backoffBaseMs: 200, backoffMaxMs: 10000 }
    const node = new FlakyNode(ctx, makeInput(retryConfig), 3)
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout')

    const promise = node.run()
    await vi.runAllTimersAsync()
    await promise

    const delays = setTimeoutSpy.mock.calls.map((c) => c[1])
    expect(delays).toEqual([200, 200, 200])
  })

  it('computes linear backoff delay growing with attempt number', async () => {
    const ctx = makeCtx()
    const retryConfig: NodeRetryConfig = { maxRetries: 3, backoffStrategy: 'linear', backoffBaseMs: 100, backoffMaxMs: 10000 }
    const node = new FlakyNode(ctx, makeInput(retryConfig), 3)
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout')

    const promise = node.run()
    await vi.runAllTimersAsync()
    await promise

    const delays = setTimeoutSpy.mock.calls.map((c) => c[1])
    expect(delays).toEqual([100, 200, 300])
  })

  it('computes exponential backoff delay doubling each attempt, capped at backoffMaxMs', async () => {
    const ctx = makeCtx()
    const retryConfig: NodeRetryConfig = { maxRetries: 4, backoffStrategy: 'exponential', backoffBaseMs: 100, backoffMaxMs: 350 }
    const node = new FlakyNode(ctx, makeInput(retryConfig), 4)
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout')

    const promise = node.run()
    await vi.runAllTimersAsync()
    await promise

    const delays = setTimeoutSpy.mock.calls.map((c) => c[1])
    // 100*2^0=100, 100*2^1=200, 100*2^2=400 (capped to 350), 100*2^3=800 (capped to 350)
    expect(delays).toEqual([100, 200, 350, 350])
  })

  it('does not run at all if ctx.aborted is already true', async () => {
    const ctx = makeCtx({ aborted: true })
    const node = new FlakyNode(ctx, makeInput(), 0)

    await node.run()
    expect(node.attempts).toBe(0)
  })
})
