import type { Page, BrowserContext } from 'playwright-core'
import type { LogEntry } from '../../../shared/types'

export interface ExecutionContext {
  page: Page
  context: BrowserContext
  profileId: string
  variables: Record<string, any>
  logs: LogEntry[]
  aborted: boolean
  onNodeStart?: (nodeId: string) => void
  onNodeDone?: (nodeId: string) => void
  onNodeError?: (nodeId: string, error: string) => void
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

  // ── Template Method ──────────────────────────
  async run(): Promise<void> {
    if (this.ctx.aborted) return

    try {
      this.onStart()
      await this.init()
      await this.execute()
      this.onSuccess()
    } catch (err: any) {
      this.onError(err)
      throw err
    }
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
