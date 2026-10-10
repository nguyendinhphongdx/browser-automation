import { BaseNode } from './base-node'
import { downloadToBuffer, extensionFromUrl } from '../../download'
import { createResourceFromBuffer, mimeTypeForExtension, defaultExtensionForKind, timestampSuffix } from '../../services/library-service'
import type { LibraryResourceKind } from '../../../shared/types'

export class HttpRequestNode extends BaseNode {
  protected async execute() {
    const url = this.resolve(this.config.url)
    const headers = this.config.headers ? JSON.parse(this.resolve(this.config.headers)) : {}
    const body = this.config.body ? this.resolve(this.config.body) : undefined
    const method = this.config.method || 'GET'

    const resp = await fetch(url, { method, headers, body })
    const data = await resp.text()

    try {
      this.setVar(this.config.variable || 'response', JSON.parse(data))
    } catch {
      this.setVar(this.config.variable || 'response', data)
    }
    this.log('info', `HTTP ${method} ${url} → ${resp.status}`)
  }
}

export class SetCookieNode extends BaseNode {
  protected async execute() {
    await this.browser.addCookies([{
      name: this.resolve(this.config.name),
      value: this.resolve(this.config.value),
      domain: this.config.domain ? this.resolve(this.config.domain) : undefined,
      path: this.config.path || '/',
      url: this.config.domain ? undefined : this.page.url()
    }])
    this.log('info', `Set cookie: ${this.config.name}`)
  }
}

export class GetCookieNode extends BaseNode {
  protected async execute() {
    const url = this.config.url ? this.resolve(this.config.url) : this.page.url()
    const cookies = await this.browser.cookies(url)
    const name = this.resolve(this.config.name)
    const cookie = cookies.find(c => c.name === name)
    if (this.config.variable) this.setVar(this.config.variable, cookie?.value || null)
    this.log('info', `Get cookie ${name}: ${cookie?.value || 'not found'}`)
  }
}

export class LocalStorageNode extends BaseNode {
  protected async execute() {
    const key = this.resolve(this.config.key)

    if (this.config.action === 'set') {
      const value = this.resolve(this.config.value)
      await this.page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value])
    } else if (this.config.action === 'remove') {
      await this.page.evaluate((k) => localStorage.removeItem(k), key)
    } else {
      const value = await this.page.evaluate((k) => localStorage.getItem(k), key)
      if (this.config.variable) this.setVar(this.config.variable, value)
    }
    this.log('info', `LocalStorage ${this.config.action}: ${key}`)
  }
}

export class NotificationNode extends BaseNode {
  protected async execute() {
    const { Notification } = require('electron')
    new Notification({
      title: this.resolve(this.config.title),
      body: this.resolve(this.config.message)
    }).show()
    this.log('info', `Notification: ${this.config.title}`)
  }
}

export class LogNode extends BaseNode {
  protected async execute() {
    const message = this.resolve(this.config.message)
    this.log(this.config.level || 'info', message)
  }
}

/**
 * Tải 1 file/ảnh từ URL (thường là "{{variable}}" lấy từ 1 get-attribute
 * trước đó, vd src của <img>) và lưu vào Thư viện — phần còn thiếu khiến
 * workflow không thể TỰ hoàn chỉnh việc "crawl ảnh rồi lưu lại": http-request
 * chỉ lưu response vào biến workflow (mất khi run kết thúc, không phải file
 * nhị phân), và không node nào khác ghi vào Thư viện cả (upload-file chỉ đọc
 * từ đó). Dùng chung downloadToBuffer/extensionFromUrl với
 * agent/tools/save-resource.ts qua main/download.ts (platform utility dùng
 * chung) — không duplicate logic tải file lần thứ 3.
 */
export class DownloadFileNode extends BaseNode {
  protected async execute() {
    const url = this.resolve(this.config.url)
    const kind = (this.config.kind || 'file') as LibraryResourceKind
    // Tên tự sinh (người dùng không đặt "name") luôn gắn thêm giờ/ngày — 2
    // lần tải cùng 1 URL (hay 2 file trùng tên base) ra 2 tên nhìn phân biệt
    // được trên Thư viện, không chỉ khác id ngầm. Tên người dùng tự đặt giữ
    // nguyên, không tự ý gắn thêm gì.
    const name = this.config.name
      ? this.resolve(this.config.name)
      : `${url.split('/').pop() || 'download'} ${timestampSuffix()}`

    const buffer = await downloadToBuffer(url)
    const extension = extensionFromUrl(url) || defaultExtensionForKind(kind)
    const tags = this.config.tags
      ? this.resolve(this.config.tags).split(',').map((t: string) => t.trim()).filter(Boolean)
      : []

    const resource = createResourceFromBuffer({
      name,
      kind,
      mimeType: mimeTypeForExtension(extension),
      extension,
      buffer,
      parentId: this.config.parentId ? this.resolve(this.config.parentId) : null,
      tags,
      objectType: 'workflow',
      objectId: this.ctx.workflowId ?? null
    })

    if (this.config.variable) this.setVar(this.config.variable, resource.id)
    this.log('info', `Đã tải và lưu "${resource.name}" (${resource.id}) vào Thư viện`)
  }
}
