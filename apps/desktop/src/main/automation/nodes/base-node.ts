import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import type { Page, BrowserContext } from 'playwright-core'
import type { LogEntry, NodeRetryConfig } from '../../../shared/types'
import { recordNodeMetric } from '../../services/metrics-service'

export interface ExecutionContext {
  page: Page
  context: BrowserContext
  profileId: string
  workflowId?: string
  workflowLogId?: string
  variables: Record<string, any>
  logs: LogEntry[]
  aborted: boolean
  depth: number  // sub-workflow recursion depth
  parentWorkflowId?: string
  onNodeStart?: (nodeId: string) => void
  onNodeDone?: (nodeId: string) => void
  onNodeError?: (nodeId: string, error: string) => void
  onNodeRetry?: (nodeId: string, attempt: number, maxRetries: number) => void
}

export interface NodeInput {
  nodeId: string
  label: string
  config: Record<string, any>
}

export abstract class BaseNode {
  protected ctx: ExecutionContext
  protected nodeId: string
  protected label: string
  protected config: Record<string, any>

  constructor(ctx: ExecutionContext, input: NodeInput) {
    this.ctx = ctx
    this.nodeId = input.nodeId
    this.label = input.label
    this.config = input.config
  }

  // ── Template Method (with retry + metrics) ───
  async run(): Promise<void> {
    if (this.ctx.aborted) return

    const retryConfig = this.config._retryConfig as NodeRetryConfig | undefined
    const maxRetries = retryConfig?.maxRetries || 0
    const nodeType = this.config._nodeType || 'unknown'
    const startTime = Date.now()

    this.onStart()
    await this.init()

    let lastError: Error | null = null
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (this.ctx.aborted) return
      try {
        if (attempt > 0) {
          const delay = this.getBackoffDelay(attempt, retryConfig!)
          this.log('warn', `Retry ${attempt}/${maxRetries} after ${delay}ms`)
          this.ctx.onNodeRetry?.(this.nodeId, attempt, maxRetries)
          await new Promise(r => setTimeout(r, delay))
        }
        await this.execute()
        this.onSuccess()
        this.recordMetric(nodeType, Date.now() - startTime, true)
        return
      } catch (err: any) {
        lastError = err
        if (attempt < maxRetries) continue
      }
    }

    // Record failure metric + screenshot
    const screenshotPath = await this.captureErrorScreenshot()
    this.recordMetric(nodeType, Date.now() - startTime, false, lastError!.message, screenshotPath)

    this.onError(lastError!)
    throw lastError!
  }

  private recordMetric(nodeType: string, timeMs: number, success: boolean, errorMessage?: string, screenshotPath?: string) {
    try {
      if (this.ctx.workflowId) {
        recordNodeMetric({
          workflowId: this.ctx.workflowId,
          workflowLogId: this.ctx.workflowLogId,
          nodeId: this.nodeId,
          nodeType,
          nodeLabel: this.label,
          executionTimeMs: timeMs,
          success,
          errorMessage,
          screenshotPath,
        })
      }
    } catch { /* metrics should never break execution */ }
  }

  private async captureErrorScreenshot(): Promise<string | undefined> {
    try {
      if (!this.ctx.page || this.ctx.page.isClosed()) return undefined
      const dir = path.join(app.getPath('userData'), 'screenshots')
      fs.mkdirSync(dir, { recursive: true })
      const filePath = path.join(dir, `error-${this.nodeId}-${Date.now()}.png`)
      await this.ctx.page.screenshot({ path: filePath, fullPage: false })
      this.log('info', `Screenshot saved: ${filePath}`)
      return filePath
    } catch {
      return undefined
    }
  }

  private getBackoffDelay(attempt: number, config: NodeRetryConfig): number {
    const base = config.backoffBaseMs || 1000
    const max = config.backoffMaxMs || 30000
    let delay: number
    switch (config.backoffStrategy) {
      case 'linear':
        delay = base * attempt
        break
      case 'exponential':
        delay = base * Math.pow(2, attempt - 1)
        break
      default: // fixed
        delay = base
    }
    return Math.min(delay, max)
  }

  // ── Lifecycle hooks ──────────────────────────

  /** Validate config, prepare data trước khi execute */
  protected async init(): Promise<void> {
    // Override nếu cần validate
  }

  /** Logic chính — bắt buộc implement */
  protected abstract execute(): Promise<void>

  /** Gọi khi bắt đầu */
  protected onStart(): void {
    this.log('info', `Executing: ${this.label}`)
    this.ctx.onNodeStart?.(this.nodeId)
  }

  /** Gọi khi thành công */
  protected onSuccess(): void {
    this.ctx.onNodeDone?.(this.nodeId)
  }

  /** Gọi khi lỗi */
  protected onError(err: Error): void {
    this.log('error', `Error: ${err.message}`)
    this.ctx.onNodeError?.(this.nodeId, err.message)
  }

  // ── Utilities ────────────────────────────────

  protected log(level: LogEntry['level'], message: string) {
    this.ctx.logs.push({
      timestamp: new Date().toISOString(),
      level,
      nodeId: this.nodeId,
      message
    })
  }

  /** Resolve {{variable}} trong string */
  protected resolve(str: string): string {
    if (!str) return str
    return str.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return this.ctx.variables[key] !== undefined ? String(this.ctx.variables[key]) : `{{${key}}}`
    })
  }

  /** Shortcut lấy page */
  protected get page(): Page {
    return this.ctx.page
  }

  /** Shortcut lấy context */
  protected get browser(): BrowserContext {
    return this.ctx.context
  }

  /** Shortcut lấy/set variable */
  protected getVar(name: string): any {
    return this.ctx.variables[name]
  }

  protected setVar(name: string, value: any): void {
    this.ctx.variables[name] = value
  }
}
