import { BaseNode } from './base-node'

export class ClickNode extends BaseNode {
  protected async init() {
    if (!this.config.selector) throw new Error('Selector is required')
  }

  protected async execute() {
    const selector = this.resolve(this.config.selector)
    await this.page.click(selector, {
      button: this.config.button || 'left',
      clickCount: this.config.clickCount || 1
    })
    this.log('info', `Clicked: ${selector}`)
  }
}

export class DoubleClickNode extends BaseNode {
  protected async init() {
    if (!this.config.selector) throw new Error('Selector is required')
  }

  protected async execute() {
    const selector = this.resolve(this.config.selector)
    await this.page.dblclick(selector)
    this.log('info', `Double-clicked: ${selector}`)
  }
}

export class TypeTextNode extends BaseNode {
  protected async init() {
    if (!this.config.selector) throw new Error('Selector is required')
    if (!this.config.text) throw new Error('Text is required')
  }

  protected async execute() {
    const selector = this.resolve(this.config.selector)
    const text = this.resolve(this.config.text)
    if (this.config.clearFirst) {
      await this.page.fill(selector, '')
    }
    await this.page.type(selector, text, { delay: this.config.delay || 50 })
    this.log('info', `Typed into: ${selector}`)
  }
}

export class PressKeyNode extends BaseNode {
  protected async init() {
    if (!this.config.key) throw new Error('Key is required')
  }

  protected async execute() {
    const key = this.resolve(this.config.key)
    if (this.config.selector) {
      await this.page.locator(this.resolve(this.config.selector)).press(key)
    } else {
      await this.page.keyboard.press(key)
    }
    this.log('info', `Pressed: ${key}`)
  }
}

export class ScrollNode extends BaseNode {
  protected async execute() {
    if (this.config.direction === 'to-element' && this.config.selector) {
      const selector = this.resolve(this.config.selector)
      await this.page.locator(selector).scrollIntoViewIfNeeded()
    } else {
      const amount = this.config.direction === 'up'
        ? -(this.config.amount || 500)
        : (this.config.amount || 500)
      await this.page.mouse.wheel(0, amount)
    }
    this.log('info', `Scrolled ${this.config.direction || 'down'}`)
  }
}

export class HoverNode extends BaseNode {
  protected async execute() {
    const selector = this.resolve(this.config.selector)
    await this.page.hover(selector)
    this.log('info', `Hovered: ${selector}`)
  }
}

export class SelectOptionNode extends BaseNode {
  protected async execute() {
    const selector = this.resolve(this.config.selector)
    const value = this.resolve(this.config.value)
    await this.page.selectOption(selector, value)
    this.log('info', `Selected: ${value}`)
  }
}

export class CheckUncheckNode extends BaseNode {
  protected async execute() {
    const selector = this.resolve(this.config.selector)
    if (this.config.checked === 'true') {
      await this.page.check(selector)
    } else {
      await this.page.uncheck(selector)
    }
    this.log('info', `${this.config.checked === 'true' ? 'Checked' : 'Unchecked'}: ${selector}`)
  }
}

export class UploadFileNode extends BaseNode {
  protected async execute() {
    const selector = this.resolve(this.config.selector)
    const filePath = this.resolve(this.config.filePath)
    await this.page.setInputFiles(selector, filePath)
    this.log('info', `Uploaded: ${filePath}`)
  }
}

export class DragDropNode extends BaseNode {
  protected async execute() {
    const source = this.resolve(this.config.sourceSelector)
    const target = this.resolve(this.config.targetSelector)
    await this.page.dragAndDrop(source, target)
    this.log('info', `Dragged ${source} → ${target}`)
  }
}
