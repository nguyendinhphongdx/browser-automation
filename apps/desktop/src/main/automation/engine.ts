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
    .filter(e => e.source === nodeId && (!handleFilter || e.sourceHandle === handleFilter) && e.edgeType !== 'on-error')
    .map(e => e.target)
}

function getErrorNodes(nodeId: string, edges: WorkflowEdge[]): string[] {
  return edges
    .filter(e => e.source === nodeId && e.edgeType === 'on-error')
    .map(e => e.target)
}

function getStartNodes(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
  const targets = new Set(edges.map(e => e.target))
  return nodes.filter(n => !targets.has(n.id))
}

// ── Branching node types (handled by orchestrator, not by node class) ──
const BRANCHING_TYPES = new Set(['if-else', 'loop', 'loop-each', 'element-exists', 'try-catch', 'break-loop', 'parallel-fork', 'parallel-join'])

// ── Execute a single node via registry ─────────

async function runNode(node: WorkflowNode, ctx: ExecutionContext): Promise<void> {
  const nodeType = getNodeType(node)
  const config = { ...node.data.config }

  // Inject metadata into config for BaseNode
  config._nodeType = nodeType
  if (node.data.retryConfig) {
    config._retryConfig = node.data.retryConfig
  }

  const instance = createNode(nodeType, ctx, {
    nodeId: node.id,
    label: node.data.label,
    config
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
      } else if (nType === 'parallel-fork') {
        await handleParallelFork(node, workflow, ctx, nodesMap, queue, visited)
      } else if (nType === 'parallel-join') {
        // Join is handled by fork — if we reach it directly, just continue
        ctx.onNodeStart?.(node.id)
        ctx.onNodeDone?.(node.id)
        getNextNodes(nodeId, workflow.edges).forEach(id => queue.push(id))
      } else {
        // Standard node — delegate to registry
        await runNode(node, ctx)
        getNextNodes(nodeId, workflow.edges).forEach(id => queue.push(id))
      }
    } catch (err: any) {
      addLog(ctx, 'error', `Error at "${node.data.label}": ${err.message}`, node.id)
      ctx.onNodeError?.(node.id, err.message)

      // Check for on-error edges — route to error handler instead of throwing
      const errorTargets = getErrorNodes(nodeId, workflow.edges)
      if (errorTargets.length > 0) {
        ctx.variables['_lastError'] = err.message
        ctx.variables['_lastErrorNodeId'] = node.id
        errorTargets.forEach(id => queue.push(id))
      } else {
        throw err
      }
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

// ── Parallel Fork Handler ─────────────────────

async function handleParallelFork(
  node: WorkflowNode, workflow: Workflow, ctx: ExecutionContext,
  nodesMap: Map<string, WorkflowNode>, queue: string[], visited: Set<string>
) {
  ctx.onNodeStart?.(node.id)
  const config = node.data.config
  const timeout = config.timeout || 60000

  // Find all branch targets from fork outputs (branch-0, branch-1, ...)
  // Branches are all normal outgoing edges from the fork
  const branchTargets = getNextNodes(node.id, workflow.edges)
  if (branchTargets.length === 0) {
    addLog(ctx, 'warn', 'Parallel fork has no branches', node.id)
    ctx.onNodeDone?.(node.id)
    return
  }

  addLog(ctx, 'info', `Parallel fork: ${branchTargets.length} branches`, node.id)

  // Find the matching join node: trace each branch until we find a parallel-join
  // that all branches converge to
  const joinNodeId = findJoinNode(branchTargets, workflow, nodesMap)

  // For each branch, collect nodes between fork and join
  const branchNodeChains = branchTargets.map(startId =>
    collectBranchNodes(startId, joinNodeId, workflow.edges, nodesMap)
  )

  // Execute branches concurrently, each with cloned variables
  const branchResults: Record<string, any>[] = []
  const branchPromises = branchNodeChains.map(async (chain, i) => {
    const branchVars = { ...ctx.variables }
    branchVars['_branchIndex'] = i

    for (const bNode of chain) {
      if (ctx.aborted) return
      const bType = getNodeType(bNode)
      // Skip branching types inside parallel (simplification — run as standard nodes)
      if (bType === 'parallel-join') continue

      const bConfig: Record<string, any> = { ...bNode.data.config, _nodeType: bType }
      if (bNode.data.retryConfig) bConfig._retryConfig = bNode.data.retryConfig

      const instance = createNode(bType, { ...ctx, variables: branchVars }, {
        nodeId: bNode.id,
        label: bNode.data.label,
        config: bConfig,
      })
      if (instance) {
        await instance.run()
      }
      visited.add(bNode.id)
    }

    branchResults.push(branchVars)
  })

  // Wait based on join mode
  const joinNode = joinNodeId ? nodesMap.get(joinNodeId) : null
  const mode = joinNode?.data.config.mode || 'all'
  const mergeStrategy = joinNode?.data.config.mergeStrategy || 'merge'

  try {
    if (mode === 'any') {
      await Promise.race([
        Promise.any(branchPromises),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Parallel timeout')), timeout))
      ])
    } else {
      await Promise.race([
        Promise.all(branchPromises),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Parallel timeout')), timeout))
      ])
    }
  } catch (err: any) {
    if (err.message === 'Parallel timeout') {
      addLog(ctx, 'warn', `Parallel branches timed out after ${timeout}ms`, node.id)
    } else {
      throw err
    }
  }

  // Merge variables from branches back to parent context
  if (branchResults.length > 0) {
    if (mergeStrategy === 'collect') {
      // Collect: for each key that differs, make it an array of branch values
      const allKeys = new Set(branchResults.flatMap(v => Object.keys(v)))
      for (const key of allKeys) {
        if (key.startsWith('_')) continue
        const values = branchResults.map(v => v[key])
        const allSame = values.every(v => v === values[0])
        if (!allSame) {
          ctx.variables[key] = values
        } else {
          ctx.variables[key] = values[0]
        }
      }
    } else if (mergeStrategy === 'last-wins') {
      const last = branchResults[branchResults.length - 1]
      Object.assign(ctx.variables, last)
    } else {
      // merge: shallow merge all
      for (const vars of branchResults) {
        for (const [k, v] of Object.entries(vars)) {
          if (!k.startsWith('_')) ctx.variables[k] = v
        }
      }
    }
  }

  addLog(ctx, 'info', `Parallel branches completed (${mergeStrategy})`, node.id)
  ctx.onNodeDone?.(node.id)

  // Mark join as visited and continue after it
  if (joinNodeId) {
    visited.add(joinNodeId)
    getNextNodes(joinNodeId, workflow.edges).forEach(id => queue.push(id))
  }
}

/** Find the parallel-join node that branches converge to */
function findJoinNode(
  branchStarts: string[], workflow: Workflow, nodesMap: Map<string, WorkflowNode>
): string | null {
  // BFS from each branch start, find the first parallel-join reachable from all branches
  const reachable = new Map<string, number>() // joinId → count of branches that reach it

  for (const start of branchStarts) {
    const seen = new Set<string>()
    const q = [start]
    while (q.length > 0) {
      const id = q.shift()!
      if (seen.has(id)) continue
      seen.add(id)
      const n = nodesMap.get(id)
      if (!n) continue
      if (getNodeType(n) === 'parallel-join') {
        reachable.set(id, (reachable.get(id) || 0) + 1)
        continue // don't traverse past join
      }
      getNextNodes(id, workflow.edges).forEach(next => q.push(next))
    }
  }

  // Find join reachable by all branches
  for (const [joinId, count] of reachable) {
    if (count >= branchStarts.length) return joinId
  }

  // Fallback: first join found
  for (const [joinId] of reachable) return joinId
  return null
}

/** Collect nodes in a branch from start until we hit joinNodeId (exclusive) */
function collectBranchNodes(
  startId: string, joinNodeId: string | null,
  edges: WorkflowEdge[], nodesMap: Map<string, WorkflowNode>
): WorkflowNode[] {
  const result: WorkflowNode[] = []
  const seen = new Set<string>()
  const q = [startId]

  while (q.length > 0) {
    const id = q.shift()!
    if (seen.has(id)) continue
    if (id === joinNodeId) continue // stop at join
    seen.add(id)

    const node = nodesMap.get(id)
    if (!node) continue
    result.push(node)

    getNextNodes(id, edges).forEach(next => q.push(next))
  }

  return result
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
