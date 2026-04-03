import { useState } from 'react'
import { Plus, Trash2, Download, Upload, Search, Cookie } from 'lucide-react'
import { useResourceStore } from '@/stores/resource-store'
import { DownloadTemplate } from './DownloadTemplate'

function CreateCookieDialog({ onClose }: { onClose: () => void }) {
  const { createCookie } = useResourceStore()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [cookies, setCookies] = useState('')
  const [notes, setNotes] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !domain.trim() || !cookies.trim()) return
    // Validate JSON
    try {
      JSON.parse(cookies)
    } catch {
      alert('Cookie phải là JSON hợp lệ')
      return
    }
    setLoading(true)
    try {
      await createCookie({
        name: name.trim(),
        domain: domain.trim(),
        cookies: cookies.trim(),
        notes: notes.trim() || undefined
      })
      onClose()
    } catch (err) {
      alert(`Lỗi: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Thêm Cookie</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-accent transition-colors text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Tên <span className="text-destructive">*</span></label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="VD: Facebook cookies" required
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Domain <span className="text-destructive">*</span></label>
            <input type="text" value={domain} onChange={e => setDomain(e.target.value)} placeholder="facebook.com" required
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Cookie JSON <span className="text-destructive">*</span>
            </label>
            <textarea value={cookies} onChange={e => setCookies(e.target.value)}
              placeholder={'[\n  {"name": "session", "value": "abc123", "domain": ".facebook.com"}\n]'}
              rows={6}
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Ghi chú</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-accent transition-colors">Huỷ</button>
            <button type="submit" disabled={loading || !name.trim() || !domain.trim() || !cookies.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {loading ? 'Đang thêm...' : 'Thêm Cookie'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function CookieTab() {
  const { cookies, deleteCookie, importCookieFile, exportCookie, loading } = useResourceStore()
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = cookies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.domain.toLowerCase().includes(search.toLowerCase()) ||
    (c.notes || '').toLowerCase().includes(search.toLowerCase())
  )

  const handleImport = async () => {
    try {
      const name = prompt('Đặt tên cho bộ cookie này:')
      if (!name) return
      const result = await importCookieFile(name)
      if (result) alert('Import cookie thành công!')
    } catch (err) {
      alert(`Lỗi: ${err}`)
    }
  }

  const getCookieCount = (cookieJson: string): number => {
    try {
      return JSON.parse(cookieJson).length
    } catch {
      return 0
    }
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Tìm cookie..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <DownloadTemplate type="cookie" />
        <button onClick={handleImport}
          className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium hover:bg-accent transition-colors">
          <Upload className="h-4 w-4" /> Import JSON
        </button>
        <button onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> Thêm Cookie
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">Đang tải...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Cookie className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-lg font-medium">Chưa có cookie nào</p>
          <p className="text-sm mt-1">Thêm cookie hoặc import từ JSON</p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Tên</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Domain</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Số cookie</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Ghi chú</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Cập nhật</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(cookie => (
                <tr key={cookie.id} className="border-b hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium">{cookie.name}</td>
                  <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{cookie.domain}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{getCookieCount(cookie.cookies)}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">{cookie.notes || '—'}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(cookie.updatedAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => exportCookie(cookie.id)}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors" title="Export JSON">
                        <Download className="h-4 w-4" />
                      </button>
                      <button onClick={() => { if (confirm('Xoá cookie này?')) deleteCookie(cookie.id) }}
                        className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Xoá">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <CreateCookieDialog onClose={() => setShowCreate(false)} />}
    </div>
  )
}
