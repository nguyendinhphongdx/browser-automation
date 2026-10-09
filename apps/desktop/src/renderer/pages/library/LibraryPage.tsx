import { useEffect, useState } from 'react'
import {
  FolderOpen, FolderPlus, Upload, FileText, Image as ImageIcon, Database, File as FileIcon,
  Plus, Trash2, Download, ChevronRight, Home, LayoutList, LayoutGrid
} from 'lucide-react'
import { useLibraryStore, type LibraryKindFilter } from '@/stores/library-store'
import type { LibraryResource } from '@shared/types'
import { CreateFolderDialog } from './CreateFolderDialog'
import { CreatePromptDialog } from './CreatePromptDialog'
import { LibraryGridCard } from '@/components/library/LibraryGridCard'
import { ResourceDetailModal } from './ResourceDetailModal'

const KIND_TABS: { value: LibraryKindFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'image', label: 'Ảnh' },
  { value: 'prompt-template', label: 'Prompt' },
  { value: 'data-export', label: 'Data' },
  { value: 'file', label: 'File' }
]

function kindIcon(kind: LibraryResource['kind']) {
  switch (kind) {
    case 'folder':
      return <FolderOpen className="h-4 w-4 text-amber-500" />
    case 'image':
      return <ImageIcon className="h-4 w-4 text-blue-500" />
    case 'prompt-template':
      return <FileText className="h-4 w-4 text-purple-500" />
    case 'data-export':
      return <Database className="h-4 w-4 text-emerald-500" />
    default:
      return <FileIcon className="h-4 w-4 text-muted-foreground" />
  }
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function LibraryPage() {
  const {
    resources, loading, kindFilter, viewMode,
    setKindFilter, setViewMode, setCurrentFolderId, fetchCurrentFolder,
    uploadResource, deleteResource, updateMetadata, exportResource
  } = useLibraryStore()
  const [breadcrumb, setBreadcrumb] = useState<{ id: string; name: string }[]>([])
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [showCreatePrompt, setShowCreatePrompt] = useState(false)
  const [detailResource, setDetailResource] = useState<LibraryResource | null>(null)

  useEffect(() => {
    fetchCurrentFolder()
  }, [])

  const enterFolder = (folder: LibraryResource) => {
    setBreadcrumb((prev) => [...prev, { id: folder.id, name: folder.name }])
    setCurrentFolderId(folder.id)
  }

  const goToBreadcrumb = (index: number) => {
    if (index < 0) {
      setBreadcrumb([])
      setCurrentFolderId(null)
      return
    }
    setBreadcrumb((prev) => prev.slice(0, index + 1))
    setCurrentFolderId(breadcrumb[index].id)
  }

  const filtered = resources.filter((r) => kindFilter === 'all' || r.kind === kindFilter || r.kind === 'folder')

  const handleDelete = async (r: LibraryResource) => {
    if (!confirm(`Xoá "${r.name}"?${r.kind === 'folder' ? ' (chỉ xoá được nếu thư mục trống)' : ''}`)) return
    try {
      await deleteResource(r.id)
    } catch (err) {
      alert(`Lỗi: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleRename = async (r: LibraryResource) => {
    const name = prompt('Tên mới:', r.name)
    if (!name || !name.trim() || name === r.name) return
    await updateMetadata(r.id, { name: name.trim() })
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Thư viện</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lưu ảnh, prompt mẫu, data export — AI và workflow có thể chọn/lưu tại đây
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateFolder(true)}
            className="inline-flex items-center gap-2 px-3 py-2.5 border rounded-lg text-sm font-medium hover:bg-accent transition-colors"
          >
            <FolderPlus className="h-4 w-4" />
            Thư mục mới
          </button>
          <button
            onClick={() => setShowCreatePrompt(true)}
            className="inline-flex items-center gap-2 px-3 py-2.5 border rounded-lg text-sm font-medium hover:bg-accent transition-colors"
          >
            <Plus className="h-4 w-4" />
            Prompt mới
          </button>
          <button
            onClick={() => uploadResource()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Upload
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 mb-4 text-sm text-muted-foreground">
        <button
          onClick={() => goToBreadcrumb(-1)}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
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

      {/* Kind tabs + view toggle */}
      <div className="flex items-center justify-between mb-4 border-b">
        <div className="flex items-center gap-1">
          {KIND_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setKindFilter(tab.value)}
              className={`px-3 pb-2.5 text-sm font-medium border-b-2 transition-colors ${
                kindFilter === tab.value
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center border rounded-lg mb-2">
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 transition-colors ${
              viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutList className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 transition-colors ${
              viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">Đang tải...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <FolderOpen className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-lg font-medium">Thư mục trống</p>
          <p className="text-sm mt-1">Upload file hoặc tạo prompt mẫu để bắt đầu</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filtered.map((r) => (
            <LibraryGridCard key={r.id} resource={r} onOpenFolder={enterFolder} onSelect={setDetailResource} />
          ))}
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Tên
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Kích thước
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Cập nhật
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="border-b last:border-0 hover:bg-accent/50 transition-colors cursor-default"
                  onDoubleClick={() => r.kind === 'folder' && enterFolder(r)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {kindIcon(r.kind)}
                      <button
                        onClick={() => (r.kind === 'folder' ? enterFolder(r) : setDetailResource(r))}
                        className="font-medium hover:underline text-left"
                      >
                        {r.name}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {r.kind === 'folder' ? '—' : formatSize(r.sizeBytes)}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(r.updatedAt).toLocaleString('vi-VN')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {r.kind !== 'folder' && (
                        <button
                          onClick={() => exportResource(r.id)}
                          className="p-1.5 rounded-md hover:bg-accent transition-colors"
                          title="Xuất ra file"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleRename(r)}
                        className="px-2 py-1 text-xs rounded-md hover:bg-accent transition-colors"
                      >
                        Đổi tên
                      </button>
                      <button
                        onClick={() => handleDelete(r)}
                        className="p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors"
                        title="Xoá"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateFolder && <CreateFolderDialog onClose={() => setShowCreateFolder(false)} />}
      {showCreatePrompt && <CreatePromptDialog onClose={() => setShowCreatePrompt(false)} />}
      {detailResource && <ResourceDetailModal resource={detailResource} onClose={() => setDetailResource(null)} />}
    </div>
  )
}
