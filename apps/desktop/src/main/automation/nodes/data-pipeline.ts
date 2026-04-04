import fs from 'fs'
import { dialog } from 'electron'
import { BaseNode } from './base-node'

/** Paginate: click next button, extract items per page, collect all */
export class PaginateNode extends BaseNode {
  protected async execute() {
    const nextSelector = this.resolve(this.config.nextButtonSelector)
    const itemSelector = this.resolve(this.config.itemSelector)
    const maxPages = this.config.maxPages || 10
    const variable = this.config.variable || 'items'
    const allItems: string[] = []

    for (let page = 0; page < maxPages && !this.ctx.aborted; page++) {
      // Extract items on current page
      const items = await this.page.locator(itemSelector).allTextContents()
      allItems.push(...items)
      this.log('info', `Page ${page + 1}: extracted ${items.length} items (total: ${allItems.length})`)

      // Try clicking next
      const nextBtn = this.page.locator(nextSelector)
      const isVisible = await nextBtn.isVisible().catch(() => false)
      const isDisabled = await nextBtn.isDisabled().catch(() => true)
      if (!isVisible || isDisabled) break

      await nextBtn.click()
      await this.page.waitForLoadState('domcontentloaded')
    }

    this.setVar(variable, allItems)
    this.log('info', `Pagination done: ${allItems.length} items collected`)
  }
}

/** Export data to CSV or JSON file */
export class ExportDataNode extends BaseNode {
  protected async execute() {
    const format = this.config.format || 'json'
    const variable = this.config.variable || 'data'
    const data = this.getVar(variable)

    if (data === undefined || data === null) {
      throw new Error(`Biến "${variable}" không tồn tại hoặc rỗng`)
    }

    let content: string
    let defaultExt: string

    if (format === 'csv') {
      content = this.toCsv(data)
      defaultExt = 'csv'
    } else {
      content = JSON.stringify(data, null, 2)
      defaultExt = 'json'
    }

    // If filePath is set, write directly; otherwise show save dialog
    let filePath = this.config.filePath ? this.resolve(this.config.filePath) : ''
    if (!filePath) {
      const result = await dialog.showSaveDialog({
        defaultPath: `export-${Date.now()}.${defaultExt}`,
        filters: [
          { name: format.toUpperCase(), extensions: [defaultExt] },
        ],
      })
      if (!result.filePath) {
        this.log('warn', 'Export cancelled')
        return
      }
      filePath = result.filePath
    }

    fs.writeFileSync(filePath, content, 'utf-8')
    this.log('info', `Exported ${format.toUpperCase()} to ${filePath}`)
  }

  private toCsv(data: any): string {
    if (!Array.isArray(data) || data.length === 0) return ''

    // Array of arrays (e.g. from extract-table)
    if (Array.isArray(data[0])) {
      return data.map((row: any[]) => row.map(cell => this.escapeCsv(String(cell ?? ''))).join(',')).join('\n')
    }

    // Array of objects
    if (typeof data[0] === 'object') {
      const keys = Object.keys(data[0])
      const header = keys.map(k => this.escapeCsv(k)).join(',')
      const rows = data.map((obj: any) => keys.map(k => this.escapeCsv(String(obj[k] ?? ''))).join(','))
      return [header, ...rows].join('\n')
    }

    // Array of primitives
    return data.map((v: any) => this.escapeCsv(String(v ?? ''))).join('\n')
  }

  private escapeCsv(val: string): string {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return '"' + val.replace(/"/g, '""') + '"'
    }
    return val
  }
}

/** Map: transform each element of an array */
export class MapDataNode extends BaseNode {
  protected async execute() {
    const source = this.getVar(this.config.sourceVariable)
    if (!Array.isArray(source)) throw new Error(`"${this.config.sourceVariable}" không phải array`)

    const expression = this.config.expression
    const fn = new Function('item', 'index', `return ${expression}`)
    const result = source.map((item, index) => fn(item, index))

    this.setVar(this.config.outputVariable || this.config.sourceVariable, result)
    this.log('info', `Map: ${source.length} → ${result.length} items`)
  }
}

/** Filter: keep elements matching a predicate */
export class FilterDataNode extends BaseNode {
  protected async execute() {
    const source = this.getVar(this.config.sourceVariable)
    if (!Array.isArray(source)) throw new Error(`"${this.config.sourceVariable}" không phải array`)

    const expression = this.config.expression
    const fn = new Function('item', 'index', `return ${expression}`)
    const result = source.filter((item, index) => fn(item, index))

    this.setVar(this.config.outputVariable || this.config.sourceVariable, result)
    this.log('info', `Filter: ${source.length} → ${result.length} items`)
  }
}

/** Reduce: fold an array into a single value */
export class ReduceDataNode extends BaseNode {
  protected async execute() {
    const source = this.getVar(this.config.sourceVariable)
    if (!Array.isArray(source)) throw new Error(`"${this.config.sourceVariable}" không phải array`)

    const expression = this.config.expression
    const initialValue = this.config.initialValue ?? ''
    const fn = new Function('acc', 'item', 'index', `return ${expression}`)

    let parsed: any = initialValue
    try { parsed = JSON.parse(initialValue) } catch {}

    const result = source.reduce((acc, item, index) => fn(acc, item, index), parsed)
    this.setVar(this.config.outputVariable || 'result', result)
    this.log('info', `Reduce: ${source.length} items → ${JSON.stringify(result).substring(0, 100)}`)
  }
}

/** Sort: sort an array by key or expression */
export class SortDataNode extends BaseNode {
  protected async execute() {
    const source = this.getVar(this.config.sourceVariable)
    if (!Array.isArray(source)) throw new Error(`"${this.config.sourceVariable}" không phải array`)

    const key = this.config.key || ''
    const order = this.config.order || 'asc'
    const multiplier = order === 'desc' ? -1 : 1

    const result = [...source].sort((a, b) => {
      const va = key ? a[key] : a
      const vb = key ? b[key] : b
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * multiplier
      return String(va).localeCompare(String(vb)) * multiplier
    })

    this.setVar(this.config.outputVariable || this.config.sourceVariable, result)
    this.log('info', `Sort: ${result.length} items (${order})`)
  }
}
