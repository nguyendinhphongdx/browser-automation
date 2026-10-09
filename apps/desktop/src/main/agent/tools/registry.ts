import type { ToolSet } from 'ai'
import type { AgentToolContext } from './types'
import { createStartBrowserTool } from './start-browser'
import { createCheckBrowserStatusTool } from './check-browser-status'
import { createCloseBrowserTool } from './close-browser'
import { createGetPageUrlTool } from './get-page-url'
import { createGetPageHtmlTool } from './get-page-html'
import { createTakeScreenshotTool } from './take-screenshot'
import { createRunJsTool } from './run-js'
import { createGetWorkflowStateTool } from './get-workflow-state'
import { createGetExecutionLogsTool } from './get-execution-logs'
import { createProposeWorkflowChangeTool } from './propose-workflow-change'
import { createProposeDestructiveWorkflowChangeTool } from './propose-destructive-workflow-change'
import { createProposeCodeChangeTool } from './propose-code-change'

/**
 * Tool names that must pause for human approval before executing — read by
 * agent-service.ts to build the ToolLoopAgent's `toolApproval` config. Kept
 * in exactly one place so gating can't drift out of sync with the actual
 * tool set.
 */
export const APPROVAL_GATED_TOOLS = [
  'run_js',
  'propose_destructive_workflow_change',
  'propose_code_change'
] as const

/**
 * Builds the full toolset for one agent run, closing over that run's
 * `AgentToolContext` (live page, workflow snapshot, etc.) — mirrors
 * `nodes/registry.ts`'s NODE_REGISTRY idea (a table of pluggable typed
 * handlers), adapted to factory functions since ToolLoopAgent consumes plain
 * `tool()` objects rather than class instances.
 */
export function buildToolset(ctx: AgentToolContext): ToolSet {
  return {
    start_browser: createStartBrowserTool(ctx),
    check_browser_status: createCheckBrowserStatusTool(ctx),
    close_browser: createCloseBrowserTool(ctx),
    get_page_url: createGetPageUrlTool(ctx),
    get_page_html: createGetPageHtmlTool(ctx),
    take_screenshot: createTakeScreenshotTool(ctx),
    run_js: createRunJsTool(ctx),
    get_workflow_state: createGetWorkflowStateTool(ctx),
    get_execution_logs: createGetExecutionLogsTool(ctx),
    propose_workflow_change: createProposeWorkflowChangeTool(ctx),
    propose_destructive_workflow_change: createProposeDestructiveWorkflowChangeTool(ctx),
    propose_code_change: createProposeCodeChangeTool(ctx)
  }
}
