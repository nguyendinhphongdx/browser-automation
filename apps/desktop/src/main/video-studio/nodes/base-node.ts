export type VideoSocketValue = string | number | boolean | undefined

export interface VideoExecutionContext {
  runId: string
  pipelineId: string
  onNodeStart?: (nodeId: string) => void
  onNodeProgress?: (nodeId: string, percent: number) => void
  onNodeDone?: (nodeId: string, outputs: Record<string, VideoSocketValue>) => void
  onNodeError?: (nodeId: string, error: string) => void
  log: (message: string) => void
}

/**
 * Khác BaseNode của Automation (không bắt buộc Playwright page/context, giá
 * trị truyền vào/ra theo từng socket đã resolve sẵn từ engine.ts — không
 * đọc/ghi 1 bag config/variables chung). Mỗi node chỉ cần biết input nào ->
 * output nào, không cần biết đồ thị tổng thể.
 */
export abstract class BaseVideoNode {
  constructor(
    protected nodeId: string,
    protected config: Record<string, any>,
    protected ctx: VideoExecutionContext
  ) {}

  abstract execute(inputs: Record<string, VideoSocketValue>): Promise<Record<string, VideoSocketValue>>

  protected log(message: string) {
    this.ctx.log(`[${this.nodeId}] ${message}`)
  }

  protected resolveConfigString(key: string): string {
    const value = this.config[key]
    return typeof value === 'string' ? value : ''
  }
}
