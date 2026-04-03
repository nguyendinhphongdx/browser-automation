import { BaseNode } from './base-node'

export class DelayNode extends BaseNode {
  protected async execute() {
    const ms = this.config.ms || 1000
    const randomExtra = this.config.random ? Math.floor(Math.random() * this.config.random) : 0
    const total = ms + randomExtra
    this.log('info', `Waiting ${total}ms`)
    await new Promise(r => setTimeout(r, total))
  }
}

export class WaitNode extends BaseNode {
  protected async execute() {
    const selector = this.resolve(this.config.selector)
    const state = this.config.state || 'visible'
    await this.page.waitForSelector(selector, { state, timeout: this.config.timeout || 30000 })
    this.log('info', `Wait done: ${selector}`)
  }
}

/**
 * Branching nodes — chỉ dùng execute() cho fallback.
 * Logic rẽ nhánh thực sự nằm trong engine orchestrator.
 */
export class ElementExistsNode extends BaseNode {
  protected async execute() {
    const selector = this.resolve(this.config.selector)
    try {
      await this.page.waitForSelector(selector, { timeout: this.config.timeout || 3000 })
      this.log('info', `Element exists: ${selector}`)
    } catch {
      this.log('info', `Element not found: ${selector}`)
    }
  }
}
