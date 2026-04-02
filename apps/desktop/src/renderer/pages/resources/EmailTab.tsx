import { useState } from 'react'
import { Plus, Trash2, Upload, Search, Mail } from 'lucide-react'
import { useResourceStore } from '@/stores/resource-store'
import type { EmailAccount } from '@shared/types'

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  locked: 'bg-red-100 text-red-700',
  verify_needed: 'bg-yellow-100 text-yellow-700',
  unknown: 'bg-gray-100 text-gray-600'
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Hoạt động',
  locked: 'Bị khoá',
  verify_needed: 'Cần xác minh',
  unknown: 'Chưa rõ'
}

const PROVIDER_ICONS: Record<string, string> = {
  gmail: '📧',
  outlook: '📬',
  yahoo: '📨',
  other: '✉️'
}

function CreateEmailDialog({ onClose }: { onClose: () => void }) {
  const { createEmail } = useResourceStore()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    setLoading(true)
    try {
      await createEmail({
        email: email.trim(),
        password: password.trim(),
        recoveryEmail: recoveryEmail.trim() || undefined,
        phone: phone.trim() || undefined,
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
      <div className="bg-card rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Thêm Email / Account</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-accent transition-colors text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Email <span className="text-destructive">*</span></label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@gmail.com" required
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Mật khẩu <span className="text-destructive">*</span></label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Email khôi phục</label>
            <input type="email" value={recoveryEmail} onChange={e => setRecoveryEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Số điện thoại</label>
            <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+84..."
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Ghi chú</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-accent transition-colors">Huỷ</button>
            <button type="submit" disabled={loading || !email.trim() || !password.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {loading ? 'Đang thêm...' : 'Thêm Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function EmailTab() {
  const { emails, deleteEmail, importEmailsCSV, loading } = useResourceStore()
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = emails.filter(e =>
    e.email.toLowerCase().includes(search.toLowerCase()) ||
    e.provider.toLowerCase().includes(search.toLowerCase()) ||
    (e.notes || '').toLowerCase().includes(search.toLowerCase())
  )

  const handleImportCSV = async () => {
    try {
      const result = await importEmailsCSV()
      if (result.length > 0) alert(`Đã import ${result.length} email thành công!`)
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
          <input type="text" placeholder="Tìm email..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <button onClick={handleImportCSV}
          className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium hover:bg-accent transition-colors">
          <Upload className="h-4 w-4" /> Import CSV
        </button>
        <button onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> Thêm Email
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">Đang tải...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Mail className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-lg font-medium">Chưa có email nào</p>
          <p className="text-sm mt-1">Thêm email hoặc import từ CSV</p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Nhà cung cấp</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Trạng thái</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">SĐT</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Ghi chú</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(email => (
                <tr key={email.id} className="border-b hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium">{email.email}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="inline-flex items-center gap-1">
                      {PROVIDER_ICONS[email.provider]} {email.provider}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[email.status]}`}>
                      {STATUS_LABELS[email.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{email.phone || '—'}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">{email.notes || '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => { if (confirm('Xoá email này?')) deleteEmail(email.id) }}
                      className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Xoá">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <CreateEmailDialog onClose={() => setShowCreate(false)} />}
    </div>
  )
}
