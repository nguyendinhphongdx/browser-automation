import { useEffect, useState } from 'react'
import { X, Search, ChevronRight, Home } from 'lucide-react'
import { LibraryGridCard } from './LibraryGridCard'
import type { LibraryResource, LibraryResourceKind } from '@shared/types'

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (resource: LibraryResource) => void
  /** Chỉ cho chọn 1 (hoặc nhiều) loại resource cụ thể; bỏ trống = cho chọn mọi loại. */
  filterKind?: LibraryResourceKind | LibraryResourceKind[]
}

/**
 * Picker dùng chung cho cả NodePropertiesPanel (field resource-select) và
 * AgentChatPanel (chèn prompt mẫu/tham chiếu file vào chat) — điều hướng cây
 * thư mục độc lập với library-store.ts's currentFolderId để không ảnh hưởng
 * tới trang Library chính nếu cả hai đang mở cùng lúc.
 */
export function ResourcePicker({ open, onClose, onSelect, filterKind }: Props) {
  const [resources, setResources] = useState<LibraryResource[]>([])
  const [loading, setLoading] = useState(false)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [breadcrumb, setBreadcrumb] = useState<{ id: string; name: string }[]>([])
  const [query, setQuery] = useState('')

  const kinds = filterKind ? (Array.isArray(filterKind) ? filterKind : [filterKind]) : null

  const load = async (folderId: string | null) => {
    setLoading(true)
    try {
      const rows = await window.api.getLibraryChildren(folderId)
      setResources(rows)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    setQuery('')
    setBreadcrumb([])
    setCurrentFolderId(null)
    load(null)
  }, [open])

  const runSearch = async (q: string) => {
    setQuery(q)
    if (!q.trim()) {
      load(currentFolderId)
      return
    }
    setLoading(true)
    try {
      const rows = await window.api.searchLibraryResources(q)
      setResources(rows)
    } finally {
      setLoading(false)
    }
  }

  const enterFolder = (folder: LibraryResource) => {
    setBreadcrumb((prev) => [...prev, { id: folder.id, name: folder.name }])
    setCurrentFolderId(folder.id)
    setQuery('')
    load(folder.id)
  }

  const goToBreadcrumb = (index: number) => {
    if (index < 0) {
      setBreadcrumb([])
      setCurrentFolderId(null)
      setQuery('')
      load(null)
      return
    }
    const next = breadcrumb.slice(0, index + 1)
    setBreadcrumb(next)
    setCurrentFolderId(next[next.length - 1].id)
    setQuery('')
    load(next[next.length - 1].id)
  }

  if (!open) return null

  const filtered = resources.filter((r) => r.kind === 'folder' || !kinds || kinds.includes(r.kind))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="text-lg font-semibold">Chọn từ Thư viện</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-accent transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 pt-4 shrink-0 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => runSearch(e.target.value)}
              placeholder="Tìm theo tên..."
              className="w-full pl-9 pr-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {!query && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <button onClick={() => goToBreadcrumb(-1)} className="flex items-center gap-1 hover:text-foreground transition-colors">
                <Home className="h-3.5 w-3.5" />
                Gốc
              </button>
              {breadcrumb.map((b, i) => (
                <span key={b.id} className="flex items-center gap-1">
                  <ChevronRight className="h-3.5 w-3.5" />
                  <button
                    onClick={() => goToBreadcrumb(i)}
                    className={i === breadcrumb.length - 1 ? 'text-foreground font-medium' : 'hover:text-foreground transition-colors'}
                  >
                    {b.name}
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto p-6 pt-3">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">Đang tải...</div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">Không có gì ở đây</div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {filtered.map((r) => (
                <LibraryGridCard
                  key={r.id}
                  resource={r}
                  onOpenFolder={enterFolder}
                  onSelect={(res) => {
                    onSelect(res)
                    onClose()
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
