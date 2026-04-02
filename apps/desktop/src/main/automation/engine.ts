import type { Page, BrowserContext } from 'playwright-core'
import type { Workflow, WorkflowNode, WorkflowEdge, LogEntry } from '../../shared/types'
import { getNodeDefinition } from './node-definitions'

export interface ExecutionContext {
  page: Page
  context: BrowserContext
  variables: Record<string, any>
  logs: LogEntry[]
  aborted: boolean
}

function addLog(ctx: ExecutionContext, level: LogEntry['level'], message: string, nodeId?: string, data?: any) {
  ctx.logs.push({
    timestamp: new Date().toISOString(),
    level,
    nodeId,
    message,
    data
  })
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

async function executeNode(node: WorkflowNode, ctx: ExecutionContext): Promise<void> {
  if (ctx.aborted) return

  const config = node.data.config || {}
  addLog(ctx, 'info', `Executing: ${node.data.label}`, node.id)

  switch (node.type) {
    // ── Browser ─────────────────────────────
    case 'open-page': {
      const url = resolveTemplate(config.url, ctx.variables)
      await ctx.page.goto(url, { waitUntil: 'domcontentloaded' })
      addLog(ctx, 'info', `Opened: ${url}`, node.id)
      break
    }
    case 'navigate': {
      if (config.action === 'back') await ctx.page.goBack()
      else if (config.action === 'forward') await ctx.page.goForward()
      else await ctx.page.reload()
      break
    }
    case 'close-tab': {
      await ctx.page.close()
      const pages = ctx.context.pages()
      if (pages.length > 0) {
        // Switch to last page
        (ctx as any).page = pages[pages.length - 1]
      }
      break
    }
    case 'screenshot': {
      const opts: any = {}
      if (config.path) opts.path = resolveTemplate(config.path, ctx.variables)
      if (config.fullPage) opts.fullPage = true
      await ctx.page.screenshot(opts)
      addLog(ctx, 'info', 'Screenshot taken', node.id)
      break
    }

    // ── Interaction ─────────────────────────
    case 'click': {
      const selector = resolveTemplate(config.selector, ctx.variables)
      await ctx.page.click(selector, { button: config.button || 'left' })
      addLog(ctx, 'info', `Clicked: ${selector}`, node.id)
      break
    }
    case 'type-text': {
      const selector = resolveTemplate(config.selector, ctx.variables)
      const text = resolveTemplate(config.text, ctx.variables)
      if (config.clearFirst) {
        await ctx.page.fill(selector, '')
      }
      await ctx.page.type(selector, text, { delay: config.delay || 50 })
      addLog(ctx, 'info', `Typed into: ${selector}`, node.id)
      break
    }
    case 'scroll': {
      if (config.direction === 'to-element' && config.selector) {
        const selector = resolveTemplate(config.selector, ctx.variables)
        await ctx.page.locator(selector).scrollIntoViewIfNeeded()
      } else {
        const amount = config.direction === 'up' ? -(config.amount || 500) : (config.amount || 500)
        await ctx.page.mouse.wheel(0, amount)
      }
      break
    }
    case 'hover': {
      const selector = resolveTemplate(config.selector, ctx.variables)
      await ctx.page.hover(selector)
      break
    }
    case 'select-option': {
      const selector = resolveTemplate(config.selector, ctx.variables)
      const value = resolveTemplate(config.value, ctx.variables)
      await ctx.page.selectOption(selector, value)
      break
    }

    // ── Data ────────────────────────────────
    case 'get-text': {
      const selector = resolveTemplate(config.selector, ctx.variables)
      const text = await ctx.page.textContent(selector)
      if (config.variable) ctx.variables[config.variable] = text
      addLog(ctx, 'info', `Got text: "${text?.substring(0, 100)}"`, node.id)
      break
    }
    case 'get-attribute': {
      const selector = resolveTemplate(config.selector, ctx.variables)
      const val = await ctx.page.getAttribute(selector, config.attribute)
      if (config.variable) ctx.variables[config.variable] = val
      break
    }
    case 'get-url': {
      const url = ctx.page.url()
      if (config.variable) ctx.variables[config.variable] = url
      break
    }

    // ── Flow ────────────────────────────────
    case 'delay': {
      const ms = config.ms || 1000
      const randomExtra = config.random ? Math.floor(Math.random() * config.random) : 0
      await new Promise(r => setTimeout(r, ms + randomExtra))
      break
    }
    case 'wait': {
      const selector = resolveTemplate(config.selector, ctx.variables)
      await ctx.page.waitForSelector(selector, { timeout: config.timeout || 30000 })
      break
    }

    // ── Integration ─────────────────────────
    case 'http-request': {
      const url = resolveTemplate(config.url, ctx.variables)
      const headers = config.headers ? JSON.parse(resolveTemplate(config.headers, ctx.variables)) : {}
      const body = config.body ? resolveTemplate(config.body, ctx.variables) : undefined
      const resp = await fetch(url, { method: config.method || 'GET', headers, body })
      const data = await resp.text()
      try {
        ctx.variables[config.variable || 'response'] = JSON.parse(data)
      } catch {
        ctx.variables[config.variable || 'response'] = data
      }
      addLog(ctx, 'info', `HTTP ${config.method || 'GET'} ${url} → ${resp.status}`, node.id)
      break
    }

    default:
      addLog(ctx, 'warn', `Unknown node type: ${node.type}`, node.id)
  }
}

function resolveTemplate(str: string, variables: Record<string, any>): string {
  if (!str) return str
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return variables[key] !== undefined ? String(variables[key]) : `{{${key}}}`
  })
}

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

  // BFS execution
  const queue = startNodes.map(n => n.id)
  const visited = new Set<string>()

  while (queue.length > 0 && !ctx.aborted) {
    const nodeId = queue.shift()!
    if (visited.has(nodeId)) continue
    visited.add(nodeId)

    const node = nodesMap.get(nodeId)
    if (!node) continue

    try {
      // Special handling for if-else and loop
      if (node.type === 'if-else') {
        const condition = resolveTemplate(node.data.config.condition, ctx.variables)
        let result = false
        try {
          result = new Function('variables', `return ${condition}`)(ctx.variables)
        } catch (e) {
          addLog(ctx, 'error', `Condition error: ${e}`, node.id)
        }

        const handle = result ? 'true' : 'false'
        addLog(ctx, 'info', `If condition → ${handle}`, node.id)
        const nextIds = getNextNodes(nodeId, workflow.edges, handle)
        // Also get default (non-handle) edges
        const defaultNext = getNextNodes(nodeId, workflow.edges).filter(id => !nextIds.includes(id))
        // Only follow the matching branch
        nextIds.forEach(id => queue.push(id))
      } else if (node.type === 'loop') {
        const count = node.data.config.count || 1
        const varName = node.data.config.variable || 'i'
        const bodyNodes = getNextNodes(nodeId, workflow.edges, 'body')
        const doneNodes = getNextNodes(nodeId, workflow.edges, 'done')

        for (let i = 0; i < count && !ctx.aborted; i++) {
          ctx.variables[varName] = i
          addLog(ctx, 'info', `Loop iteration ${i + 1}/${count}`, node.id)
          // Execute body branch for each iteration
          for (const bodyId of bodyNodes) {
            const bodyNode = nodesMap.get(bodyId)
            if (bodyNode) await executeNode(bodyNode, ctx)
          }
        }

        doneNodes.forEach(id => queue.push(id))
      } else {
        await executeNode(node, ctx)
        const nextIds = getNextNodes(nodeId, workflow.edges)
        nextIds.forEach(id => queue.push(id))
      }
    } catch (err: any) {
      addLog(ctx, 'error', `Error at "${node.data.label}": ${err.message}`, node.id)
      throw err
    }
  }

  addLog(ctx, 'info', 'Workflow completed')
}

export async function executeCodeWorkflow(
  code: string,
  ctx: ExecutionContext
): Promise<void> {
  addLog(ctx, 'info', 'Executing code workflow')

  // Create a sandboxed API for the code
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
