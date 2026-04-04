import { BaseNode } from './base-node'
import type { ExecutionContext, NodeInput } from './base-node'
import { getWorkflowById } from '../../services/workflow-service'

const MAX_DEPTH = 10

export class RunWorkflowNode extends BaseNode {
  constructor(ctx: ExecutionContext, input: NodeInput) {
    super(ctx, input)
  }

  protected async execute(): Promise<void> {
    const workflowId = this.resolve(this.config.workflowId || '')
    const maxDepth = this.config.maxDepth || MAX_DEPTH

    if (!workflowId) {
      throw new Error('Chưa chọn workflow để chạy')
    }

    // Check recursion depth
    if (this.ctx.depth >= maxDepth) {
      throw new Error(`Đã vượt quá giới hạn đệ quy (${maxDepth} cấp)`)
    }

    const workflow = getWorkflowById(workflowId)
    if (!workflow) {
      throw new Error(`Workflow "${workflowId}" không tồn tại`)
    }

    // Map input variables: parent → child
    const inputMappings = this.config.inputMappings as Record<string, string> || {}
    const childVars: Record<string, any> = {}

    // Copy default values from child workflow's variables
    for (const v of workflow.variables) {
      childVars[v.name] = v.defaultValue
    }

    // Apply input mappings (parent var name → child var name)
    for (const [childVar, parentVar] of Object.entries(inputMappings)) {
      if (parentVar && this.ctx.variables[parentVar] !== undefined) {
        childVars[childVar] = this.ctx.variables[parentVar]
      }
    }

    this.log('info', `Running sub-workflow: ${workflow.name} (depth: ${this.ctx.depth + 1})`)

    // Create child context
    const childCtx: ExecutionContext = {
      page: this.ctx.page,
      context: this.ctx.context,
      profileId: this.ctx.profileId,
      variables: childVars,
      logs: this.ctx.logs, // share logs for unified view
      aborted: this.ctx.aborted,
      depth: this.ctx.depth + 1,
      parentWorkflowId: workflow.id,
      onNodeStart: this.ctx.onNodeStart,
      onNodeDone: this.ctx.onNodeDone,
      onNodeError: this.ctx.onNodeError,
      onNodeRetry: this.ctx.onNodeRetry,
    }

    // Lazy import to avoid circular dependency
    const { executeVisualWorkflow, executeCodeWorkflow } = await import('../engine')

    if (workflow.mode === 'code' && workflow.code) {
      await executeCodeWorkflow(workflow.code, childCtx)
    } else {
      await executeVisualWorkflow(workflow, childCtx)
    }

    // Propagate abort status
    if (childCtx.aborted) {
      this.ctx.aborted = true
    }

    // Map output variables: child → parent
    const outputMappings = this.config.outputMappings as Record<string, string> || {}
    for (const [parentVar, childVar] of Object.entries(outputMappings)) {
      if (childVar && childCtx.variables[childVar] !== undefined) {
        this.ctx.variables[parentVar] = childCtx.variables[childVar]
      }
    }

    this.log('info', `Sub-workflow "${workflow.name}" completed`)
  }
}
