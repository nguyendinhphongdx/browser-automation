import { useState } from 'react'
import { Plus, Trash2, Upload, RefreshCw, Search, Wifi } from 'lucide-react'
import { useResourceStore } from '@/stores/resource-store'
import type { Proxy } from '@shared/types'

const STATUS_STYLES: Record<string, string> = {
  alive: 'bg-green-100 text-green-700',
  dead: 'bg-red-100 text-red-700',
  unknown: 'bg-gray-100 text-gray-600'
}

const STATUS_LABELS: Record<string, string> = {
  alive: 'Sống',
  dead: 'Chết',
  unknown: 'Chưa kiểm tra'
}

function CreateProxyDialog({ onClose }: { onClose: () => void }) {
  const { createProxy } = useResourceStore()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<Proxy['type']>('http')
  const [host, setHost] = useState('')
  const [port, setPort] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [country, setCountry] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!host.trim() || !port.trim()) return
    setLoading(true)
    try {
      await createProxy({
        name: name.trim() || `${host}:${port}`,
        type,
        host: host.trim(),
        port: parseInt(port),
        username: username.trim() || undefined,
        password: password.trim() || undefined,
        country: country.trim() || undefined
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
      <div className="bg-card rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Thêm Proxy</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-accent transition-colors text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Tên</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="VD: US Proxy 1"
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Loại <span className="text-destructive">*</span></label>
              <select value={type} onChange={e => setType(e.target.value as Proxy['type'])}
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="http">HTTP</option>
                <option value="https">HTTPS</option>
                <option value="socks4">SOCKS4</option>
                <option value="socks5">SOCKS5</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Quốc gia</label>
              <input type="text" value={country} onChange={e => setCountry(e.target.value)} placeholder="VN, US..."
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5">Host <span className="text-destructive">*</span></label>
              <input type="text" value={host} onChange={e => setHost(e.target.value)} placeholder="192.168.1.1" required
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Port <span className="text-destructive">*</span></label>
              <input type="number" value={port} onChange={e => setPort(e.target.value)} placeholder="8080" required
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-accent transition-colors">Huỷ</button>
            <button type="submit" disabled={loading || !host.trim() || !port.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {loading ? 'Đang thêm...' : 'Thêm Proxy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ImportProxyDialog({ onClose }: { onClose: () => void }) {
  const { importProxies } = useResourceStore()
  const [loading, setLoading] = useState(false)
  const [text, setText] = useState('')
  const [type, setType] = useState<Proxy['type']>('http')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    setLoading(true)
    try {
      const lines = text.split('\n')
      const result = await importProxies(lines, type)
      alert(`Đã import ${result.length} proxy thành công!`)
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
          <h2 className="text-lg font-semibold">Import Proxy</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-accent transition-colors text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Loại mặc định</label>
            <select value={type} onChange={e => setType(e.target.value as Proxy['type'])}
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="http">HTTP</option>
              <option value="https">HTTPS</option>
              <option value="socks4">SOCKS4</option>
              <option value="socks5">SOCKS5</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Danh sách proxy <span className="text-muted-foreground font-normal">(mỗi dòng 1 proxy)</span>
            </label>
            <textarea value={text} onChange={e => setText(e.target.value)}
              placeholder={"host:port\nhost:port:user:pass\nsocks5://user:pass@host:port"}
              rows={8}
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-accent transition-colors">Huỷ</button>
            <button type="submit" disabled={loading || !text.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {loading ? 'Đang import...' : 'Import'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function ProxyTab() {
  const { proxies, deleteProxy, checkProxy, importProxiesFile, loading } = useResourceStore()
  const [showCreate, setShowCreate] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [search, setSearch] = useState('')
  const [checkingId, setCheckingId] = useState<string | null>(null)

  const filtered = proxies.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.host.toLowerCase().includes(search.toLowerCase()) ||
    (p.country || '').toLowerCase().includes(search.toLowerCase())
  )

  const handleCheck = async (id: string) => {
    setCheckingId(id)
    try { await checkProxy(id) } finally { setCheckingId(null) }
  }

  const handleImportFile = async () => {
    try {
      const result = await importProxiesFile()
      if (result.length > 0) alert(`Đã import ${result.length} proxy thành công!`)
    } catch (err) {
      alert(`Lỗi: ${err}`)
    }
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Tìm proxy..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <button onClick={handleImportFile}
          className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium hover:bg-accent transition-colors">
          <Upload className="h-4 w-4" /> Import File
        </button>
        <button onClick={() => setShowImport(true)}
          className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium hover:bg-accent transition-colors">
          <Upload className="h-4 w-4" /> Import Text
        </button>
        <button onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> Thêm Proxy
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">Đang tải...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Wifi className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-lg font-medium">Chưa có proxy nào</p>
          <p className="text-sm mt-1">Thêm proxy để bắt đầu sử dụng</p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Tên</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Loại</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Host:Port</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Auth</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Quốc gia</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Trạng thái</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Tốc độ</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(proxy => (
                <tr key={proxy.id} className="border-b hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium">{proxy.name}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-0.5 bg-secondary rounded text-xs uppercase">{proxy.type}</span>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{proxy.host}:{proxy.port}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{proxy.username ? 'Co' : 'Khong'}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{proxy.country || '—'}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[proxy.status]}`}>
                      {STATUS_LABELS[proxy.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {proxy.speed ? `${proxy.speed}ms` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleCheck(proxy.id)} disabled={checkingId === proxy.id}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors" title="Kiểm tra">
                        <RefreshCw className={`h-4 w-4 ${checkingId === proxy.id ? 'animate-spin' : ''}`} />
                      </button>
                      <button onClick={() => { if (confirm('Xoá proxy này?')) deleteProxy(proxy.id) }}
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

      {showCreate && <CreateProxyDialog onClose={() => setShowCreate(false)} />}
      {showImport && <ImportProxyDialog onClose={() => setShowImport(false)} />}
    </div>
  )
}
