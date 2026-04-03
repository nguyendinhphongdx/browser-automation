import { BaseNode } from './base-node'

export class GetTextNode extends BaseNode {
  protected async execute() {
    const selector = this.resolve(this.config.selector)
    const text = await this.page.textContent(selector)
    if (this.config.variable) this.setVar(this.config.variable, text)
    this.log('info', `Got text: "${text?.substring(0, 100)}"`)
  }
}

export class GetAttributeNode extends BaseNode {
  protected async execute() {
    const selector = this.resolve(this.config.selector)
    const val = await this.page.getAttribute(selector, this.config.attribute)
    if (this.config.variable) this.setVar(this.config.variable, val)
    this.log('info', `Got ${this.config.attribute}: "${val}"`)
  }
}

export class GetUrlNode extends BaseNode {
  protected async execute() {
    const url = this.page.url()
    if (this.config.variable) this.setVar(this.config.variable, url)
    this.log('info', `URL: ${url}`)
  }
}

export class GetTitleNode extends BaseNode {
  protected async execute() {
    const title = await this.page.title()
    if (this.config.variable) this.setVar(this.config.variable, title)
    this.log('info', `Title: "${title}"`)
  }
}

export class CountElementsNode extends BaseNode {
  protected async execute() {
    const selector = this.resolve(this.config.selector)
    const count = await this.page.locator(selector).count()
    if (this.config.variable) this.setVar(this.config.variable, count)
    this.log('info', `Count "${selector}": ${count}`)
  }
}

export class SetVariableNode extends BaseNode {
  protected async execute() {
    const varName = this.resolve(this.config.variable)
    const value = this.resolve(this.config.value)
    this.setVar(varName, value)
    this.log('info', `Set ${varName} = "${value}"`)
  }
}

export class EvalJsNode extends BaseNode {
  protected async execute() {
    const code = this.resolve(this.config.code)
    const result = await this.page.evaluate(code)
    if (this.config.variable) this.setVar(this.config.variable, result)
    this.log('info', `JS result: ${JSON.stringify(result)?.substring(0, 100)}`)
  }
}

export class ExtractTableNode extends BaseNode {
  protected async execute() {
    const selector = this.resolve(this.config.selector)
    const data = await this.page.evaluate((sel: string) => {
      const table = document.querySelector(sel)
      if (!table) return []
      const rows = table.querySelectorAll('tr')
      return Array.from(rows).map(row =>
        Array.from(row.querySelectorAll('td, th')).map(cell => cell.textContent?.trim() || '')
      )
    }, selector)
    if (this.config.variable) this.setVar(this.config.variable, data)
    this.log('info', `Extracted table: ${data.length} rows`)
  }
}
