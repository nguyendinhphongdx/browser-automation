import type { Page, BrowserContext } from 'playwright-core'
import type { Workflow } from '../../shared/types'
import { executeVisualWorkflow, executeCodeWorkflow, type ExecutionContext } from './engine'

export interface BuildExecutionContextOptions {
  /** Already-resolved Playwright page/context — no `as any` casts needed here. */
  page: Page
  context: BrowserContext
  profileId: string
  /** Workflow whose `variables` defaults seed the new context's variables. */
  workflow: Workflow
  workflowId?: string
  workflowLogId?: string
  parentWorkflowId?: string
  /** Sub-workflow recursion depth. Defaults to 0 (top-level run). */
  depth?: number
  onNodeStart?: ExecutionContext['onNodeStart']
  onNodeDone?: ExecutionContext['onNodeDone']
  onNodeError?: ExecutionContext['onNodeError']
  onNodeRetry?: ExecutionContext['onNodeRetry']
}

/**
 * Builds a fully-populated ExecutionContext from already-resolved browser
 * primitives. Centralizes the variable-seeding logic that used to be
 * duplicated identically in scheduler.ts and campaign-engine.ts.
 */
export function buildExecutionContext(opts: BuildExecutionContextOptions): ExecutionContext {
  // ExecutionContext.variables is typed as Record<string, any> (unchanged,
  // see base-node.ts) — build it here as Record<string, unknown> instead
  // since `unknown` values are assignable into an `any`-valued record.
  const variables: Record<string, unknown> = {}
  for (const v of opts.workflow.variables) {
    variables[v.name] = v.defaultValue
  }

  return {
    page: opts.page,
    context: opts.context,
    profileId: opts.profileId,
    workflowId: opts.workflowId,
    workflowLogId: opts.workflowLogId,
    parentWorkflowId: opts.parentWorkflowId,
    variables,
    logs: [],
    aborted: false,
    depth: opts.depth ?? 0,
    onNodeStart: opts.onNodeStart,
    onNodeDone: opts.onNodeDone,
    onNodeError: opts.onNodeError,
    onNodeRetry: opts.onNodeRetry,
  }
}

/**
 * Dispatches a single workflow run (visual or code mode) against an already
 * built ExecutionContext. Canonical version of the dispatch logic that used
 * to live separately (and slightly differently) in scheduler.ts and
 * campaign-engine.ts.
 */
export async function runWorkflowOnce(workflow: Workflow, ctx: ExecutionContext): Promise<void> {
  if (workflow.mode === 'code' && workflow.code) {
    await executeCodeWorkflow(workflow.code, ctx)
  } else {
    await executeVisualWorkflow(workflow, ctx)
  }
}
