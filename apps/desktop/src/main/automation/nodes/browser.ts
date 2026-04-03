import { BaseNode } from './base-node'
import { closeBrowser } from '../../browser/launcher'

export class OpenPageNode extends BaseNode {
  protected async init() {
    if (!this.config.url) throw new Error('URL is required')
  }

  protected async execute() {
    const url = this.resolve(this.config.url)
    await this.page.goto(url, { waitUntil: this.config.waitUntil || 'domcontentloaded' })
    this.log('info', `Opened: ${url}`)
  }
}

export class NavigateNode extends BaseNode {
  protected async execute() {
    if (this.config.action === 'back') await this.page.goBack()
    else if (this.config.action === 'forward') await this.page.goForward()
    else await this.page.reload()
    this.log('info', `Navigate: ${this.config.action || 'reload'}`)
  }
}

export class NewTabNode extends BaseNode {
  protected async execute() {
    const url = this.config.url ? this.resolve(this.config.url) : 'about:blank'
    const newPage = await this.browser.newPage()
    if (url !== 'about:blank') await newPage.goto(url, { waitUntil: 'domcontentloaded' })
    this.ctx.page = newPage
    this.log('info', `New tab: ${url}`)
  }
}

export class SwitchTabNode extends BaseNode {
  protected async execute() {
    const pages = this.browser.pages()
    const val = this.resolve(this.config.value)

    if (this.config.by === 'index') {
      const idx = parseInt(val, 10)
      if (pages[idx]) this.ctx.page = pages[idx]
    } else if (this.config.by === 'title') {
      for (const p of pages) {
        if ((await p.title()).includes(val)) { this.ctx.page = p; break }
      }
    } else if (this.config.by === 'url') {
      for (const p of pages) {
        if (p.url().includes(val)) { this.ctx.page = p; break }
      }
    }
    this.log('info', `Switched tab by ${this.config.by}: ${val}`)
  }
}

export class CloseTabNode extends BaseNode {
  protected async execute() {
    await this.page.close()
    const pages = this.browser.pages()
    if (pages.length > 0) {
      this.ctx.page = pages[pages.length - 1]
    }
    this.log('info', 'Tab closed')
  }
}

export class CloseBrowserNode extends BaseNode {
  protected async execute() {
    await closeBrowser(this.ctx.profileId)
    this.log('info', 'Browser closed')
  }
}

export class ScreenshotNode extends BaseNode {
  protected async execute() {
    const opts: any = {}
    if (this.config.path) opts.path = this.resolve(this.config.path)
    if (this.config.fullPage) opts.fullPage = true

    if (this.config.selector) {
      await this.page.locator(this.resolve(this.config.selector)).screenshot(opts)
    } else {
      await this.page.screenshot(opts)
    }
    this.log('info', 'Screenshot taken')
  }
}

export class SetViewportNode extends BaseNode {
  protected async execute() {
    await this.page.setViewportSize({
      width: this.config.width || 1920,
      height: this.config.height || 1080
    })
    this.log('info', `Viewport: ${this.config.width}x${this.config.height}`)
  }
}
