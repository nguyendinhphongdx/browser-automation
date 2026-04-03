import type { Workflow, WorkflowNode, WorkflowEdge, LogEntry } from '../../shared/types'
import { createNode } from './nodes/registry'
import type { ExecutionContext } from './nodes/base-node'

export type { ExecutionContext } from './nodes/base-node'

// ── Helpers ────────────────────────────────────

function addLog(ctx: ExecutionContext, level: LogEntry['level'], message: string, nodeId?: string) {
  ctx.logs.push({ timestamp: new Date().toISOString(), level, nodeId, message })
}

function resolveTemplate(str: string, variables: Record<string, any>): string {
  if (!str) return str
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    variables[key] !== undefined ? String(variables[key]) : `{{${key}}}`
  )
}

function getNodeType(node: WorkflowNode): string {
  return (node.data as any).nodeType || node.type
}

function getNextNodes(nodeId: string, edges: WorkflowEdge[], handleFilter?: string): string[] {
  return edges
    .filter(e => e.source === nodeId && (!handleFilter || e.sourceHandle === handleFilter))
    .map(e => e.target)
}

function getStartNodes(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
  const targets = new Set(edges.map(e => e.target))
  return nodes.filter(n => !targets.has(n.id))
}

// ── Branching node types (handled by orchestrator, not by node class) ──
const BRANCHING_TYPES = new Set(['if-else', 'loop', 'loop-each', 'element-exists', 'try-catch', 'break-loop'])

// ── Execute a single node via registry ─────────

async function runNode(node: WorkflowNode, ctx: ExecutionContext): Promise<void> {
  const nodeType = getNodeType(node)
  const instance = createNode(nodeType, ctx, {
    nodeId: node.id,
    label: node.data.label,
    config: node.data.config || {}
  })

  if (!instance) {
    addLog(ctx, 'warn', `Unknown node type: ${nodeType}`, node.id)
    return
  }

  await instance.run()
}

// ── Visual Workflow Orchestrator ────────────────

export async function executeVisualWorkflow(
  workflow: Workflow,
  ctx: ExecutionContext
): Promise<void> {
  const nodesMap = new Map(workflow.nodes.map(n => [n.id, n]))
  const startNodes = getStartNodes(workflow.nodes, workflow.edges)

  if (startNodes.length === 0) {
    addLog(ctx, 'error', 'No start node found')
    return
  }

  addLog(ctx, 'info', `Starting workflow: ${workflow.name}`)

  const queue = startNodes.map(n => n.id)
  const visited = new Set<string>()

  while (queue.length > 0 && !ctx.aborted) {
    const nodeId = queue.shift()!
    if (visited.has(nodeId)) continue
    visited.add(nodeId)

    const node = nodesMap.get(nodeId)
    if (!node) continue

    const nType = getNodeType(node)

    try {
      if (nType === 'if-else') {
        await handleIfElse(node, workflow.edges, ctx, queue)
      } else if (nType === 'loop') {
        await handleLoop(node, workflow.edges, ctx, nodesMap, queue)
      } else if (nType === 'loop-each') {
        await handleLoopEach(node, workflow.edges, ctx, nodesMap, queue)
      } else if (nType === 'element-exists') {
        await handleElementExists(node, workflow.edges, ctx, queue)
      } else if (nType === 'try-catch') {
        await handleTryCatch(node, workflow.edges, ctx, nodesMap, queue)
      } else if (nType === 'break-loop') {
        addLog(ctx, 'info', 'Break loop', node.id)
        ctx.onNodeStart?.(node.id)
        ctx.onNodeDone?.(node.id)
        // Không push next — dừng lại
      } else {
        // Standard node — delegate to registry
        await runNode(node, ctx)
        getNextNodes(nodeId, workflow.edges).forEach(id => queue.push(id))
      }
    } catch (err: any) {
      addLog(ctx, 'error', `Error at "${node.data.label}": ${err.message}`, node.id)
      ctx.onNodeError?.(node.id, err.message)
      throw err
    }
  }

  addLog(ctx, 'info', 'Workflow completed')
}

// ── Branching Handlers ─────────────────────────

async function handleIfElse(
  node: WorkflowNode, edges: WorkflowEdge[], ctx: ExecutionContext, queue: string[]
) {
  ctx.onNodeStart?.(node.id)
  const condition = resolveTemplate(node.data.config.condition, ctx.variables)
  let result = false
  try {
    result = new Function('variables', `return ${condition}`)(ctx.variables)
  } catch (e) {
    addLog(ctx, 'error', `Condition error: ${e}`, node.id)
  }

  const handle = result ? 'true' : 'false'
  addLog(ctx, 'info', `If condition → ${handle}`, node.id)
  ctx.onNodeDone?.(node.id)
  getNextNodes(node.id, edges, handle).forEach(id => queue.push(id))
}

async function handleLoop(
  node: WorkflowNode, edges: WorkflowEdge[], ctx: ExecutionContext,
  nodesMap: Map<string, WorkflowNode>, queue: string[]
) {
  ctx.onNodeStart?.(node.id)
  const count = node.data.config.count || 1
  const varName = node.data.config.variable || 'i'
  const bodyNodes = getNextNodes(node.id, edges, 'body')
  const doneNodes = getNextNodes(node.id, edges, 'done')

  for (let i = 0; i < count && !ctx.aborted; i++) {
    ctx.variables[varName] = i
    addLog(ctx, 'info', `Loop iteration ${i + 1}/${count}`, node.id)
    for (const bodyId of bodyNodes) {
      const bodyNode = nodesMap.get(bodyId)
      if (bodyNode) await runNode(bodyNode, ctx)
    }
  }

  ctx.onNodeDone?.(node.id)
  doneNodes.forEach(id => queue.push(id))
}

async function handleLoopEach(
  node: WorkflowNode, edges: WorkflowEdge[], ctx: ExecutionContext,
  nodesMap: Map<string, WorkflowNode>, queue: string[]
) {
  ctx.onNodeStart?.(node.id)
  const selector = resolveTemplate(node.data.config.selector, ctx.variables)
  const varName = node.data.config.variable || 'element'
  const indexVar = node.data.config.indexVar || 'index'
  const bodyNodes = getNextNodes(node.id, edges, 'body')
  const doneNodes = getNextNodes(node.id, edges, 'done')
  const count = await ctx.page.locator(selector).count()

  for (let i = 0; i < count && !ctx.aborted; i++) {
    ctx.variables[indexVar] = i
    ctx.variables[varName] = await ctx.page.locator(selector).nth(i).textContent()
    addLog(ctx, 'info', `Loop-each ${i + 1}/${count}`, node.id)
    for (const bodyId of bodyNodes) {
      const bodyNode = nodesMap.get(bodyId)
      if (bodyNode) await runNode(bodyNode, ctx)
    }
  }

  ctx.onNodeDone?.(node.id)
  doneNodes.forEach(id => queue.push(id))
}

async function handleElementExists(
  node: WorkflowNode, edges: WorkflowEdge[], ctx: ExecutionContext, queue: string[]
) {
  ctx.onNodeStart?.(node.id)
  const selector = resolveTemplate(node.data.config.selector, ctx.variables)
  let exists = false
  try {
    await ctx.page.waitForSelector(selector, { timeout: node.data.config.timeout || 3000 })
    exists = true
  } catch { /* not found */ }

  const handle = exists ? 'true' : 'false'
  addLog(ctx, 'info', `Element "${selector}" ${exists ? 'exists' : 'not found'}`, node.id)
  ctx.onNodeDone?.(node.id)
  getNextNodes(node.id, edges, handle).forEach(id => queue.push(id))
}

async function handleTryCatch(
  node: WorkflowNode, edges: WorkflowEdge[], ctx: ExecutionContext,
  nodesMap: Map<string, WorkflowNode>, queue: string[]
) {
  ctx.onNodeStart?.(node.id)
  const tryNodes = getNextNodes(node.id, edges, 'try')
  const catchNodes = getNextNodes(node.id, edges, 'catch')

  try {
    for (const tryId of tryNodes) {
      const tryNode = nodesMap.get(tryId)
      if (tryNode) await runNode(tryNode, ctx)
    }
    ctx.onNodeDone?.(node.id)
  } catch (e: any) {
    ctx.variables[node.data.config.errorVar || 'error'] = e.message
    addLog(ctx, 'warn', `Try failed: ${e.message}`, node.id)
    ctx.onNodeDone?.(node.id)
    catchNodes.forEach(id => queue.push(id))
  }
}

// ── Code Workflow ──────────────────────────────

export async function executeCodeWorkflow(
  code: string,
  ctx: ExecutionContext
): Promise<void> {
  addLog(ctx, 'info', 'Executing code workflow')

  const api = {
    page: ctx.page,
    context: ctx.context,
    variables: ctx.variables,
    log: (msg: string) => addLog(ctx, 'info', msg),
    delay: (ms: number) => new Promise(r => setTimeout(r, ms))
  }

  try {
    const fn = new Function('api', `
      const { page, context, variables, log, delay } = api;
      return (async () => { ${code} })();
    `)
    await fn(api)
    addLog(ctx, 'info', 'Code execution completed')
  } catch (err: any) {
    addLog(ctx, 'error', `Code error: ${err.message}`)
    throw err
  }
}
