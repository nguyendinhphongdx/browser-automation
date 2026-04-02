import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useProfileStore } from '@/stores/profile-store'
import { useResourceStore } from '@/stores/resource-store'
import type { BrowserType, CreateProfileInput } from '@shared/types'

const BROWSER_OPTIONS: { value: BrowserType; label: string; icon: string }[] = [
  { value: 'chrome', label: 'Google Chrome', icon: '🌐' },
  { value: 'brave', label: 'Brave', icon: '🦁' },
  { value: 'edge', label: 'Microsoft Edge', icon: '📘' },
  { value: 'firefox', label: 'Firefox', icon: '🦊' },
  { value: 'opera', label: 'Opera', icon: '🔴' },
  { value: 'vivaldi', label: 'Vivaldi', icon: '🎨' },
  { value: 'chromium', label: 'Chromium', icon: '⚡' },
  { value: 'custom', label: 'Tuỳ chỉnh...', icon: '🔧' }
]

const COLORS = [
  '#3B82F6',
  '#EF4444',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#F97316',
  '#6366F1',
  '#14B8A6'
]

interface Props {
  onClose: () => void
}

export function CreateProfileDialog({ onClose }: Props) {
  const { createProfile, installedBrowsers } = useProfileStore()
  const { proxies, fetchProxies } = useResourceStore()
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState('')
  const [browserType, setBrowserType] = useState<BrowserType>('chrome')
  const [customPath, setCustomPath] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [tags, setTags] = useState('')
  const [notes, setNotes] = useState('')
  const [proxyId, setProxyId] = useState<string | null>(null)

  useEffect(() => { fetchProxies() }, [])

  const isInstalled = (type: BrowserType) =>
    installedBrowsers.some((b) => b.type === type)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      const data: CreateProfileInput = {
        name: name.trim(),
        browserType,
        color,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        notes,
        proxyId,
        browserExecutablePath:
          browserType === 'custom' ? customPath : undefined
      }
      await createProfile(data)
      onClose()
    } catch (err) {
      alert(`Lỗi: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Tạo Profile mới</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-accent transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Tên */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Tên profile <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Facebook Account 1"
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          {/* Trình duyệt */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Trình duyệt
            </label>
            <div className="grid grid-cols-4 gap-2">
              {BROWSER_OPTIONS.map((opt) => {
                const installed = isInstalled(opt.value)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setBrowserType(opt.value)}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-xs font-medium transition-colors ${
                      browserType === opt.value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:bg-accent'
                    } ${!installed && opt.value !== 'custom' ? 'opacity-50' : ''}`}
                  >
                    <span className="text-lg">{opt.icon}</span>
                    <span className="truncate w-full text-center">
                      {opt.label}
                    </span>
                    {opt.value !== 'custom' && (
                      <span
                        className={`text-[10px] ${installed ? 'text-green-600' : 'text-muted-foreground'}`}
                      >
                        {installed ? 'Đã cài' : 'Chưa cài'}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Đường dẫn tuỳ chỉnh */}
          {browserType === 'custom' && (
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Đường dẫn file thực thi
              </label>
              <input
                type="text"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                placeholder="/usr/bin/my-browser"
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          {/* Màu sắc */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Màu sắc</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    color === c
                      ? 'border-foreground scale-110'
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Tags{' '}
              <span className="text-muted-foreground font-normal">
                (phân cách bằng dấu phẩy)
              </span>
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="facebook, ads, account1"
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Proxy */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Proxy</label>
            <select
              value={proxyId || ''}
              onChange={(e) => setProxyId(e.target.value || null)}
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Không sử dụng proxy</option>
              {proxies.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.type}://{p.host}:{p.port})
                </option>
              ))}
            </select>
          </div>

          {/* Ghi chú */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Ghi chú</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú về profile này..."
              rows={3}
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-accent transition-colors"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Đang tạo...' : 'Tạo Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
