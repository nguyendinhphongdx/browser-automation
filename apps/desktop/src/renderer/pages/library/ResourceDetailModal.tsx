import { useEffect, useState } from 'react'
import { X, Download, Trash2, Save } from 'lucide-react'
import { useLibraryStore } from '@/stores/library-store'
import type { LibraryResource } from '@shared/types'

interface Props {
  resource: LibraryResource
  onClose: () => void
}

export function ResourceDetailModal({ resource, onClose }: Props) {
  const { updateMetadata, updateContent, deleteResource, exportResource, getTextContent } = useLibraryStore()
  const [name, setName] = useState(resource.name)
  const [tags, setTags] = useState(resource.tags.join(', '))
  const [notes, setNotes] = useState(resource.notes)
  const [text, setText] = useState<string | null>(null)
  const [originalText, setOriginalText] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const isTextKind =
    resource.kind === 'prompt-template' || resource.mimeType.startsWith('text/') || resource.mimeType === 'application/json'

  useEffect(() => {
    if (isTextKind) {
      getTextContent(resource.id).then((content) => {
        setText(content)
        setOriginalText(content)
      })
    }
  }, [resource.id])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateMetadata(resource.id, {
        name: name.trim(),
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        notes
      })
      if (isTextKind && text !== null && text !== originalText) {
        await updateContent(resource.id, text)
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Xoá "${resource.name}"?`)) return
    await deleteResource(resource.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold truncate">{resource.name}</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-accent transition-colors shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {resource.kind === 'image' && (
            <img
              src={`app-resource://${resource.id}`}
              alt={resource.name}
              className="w-full max-h-64 object-contain rounded-lg border bg-muted/30"
            />
          )}

          {isTextKind && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Nội dung</label>
              <textarea
                value={text ?? ''}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">Tên</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Tags (phân cách bằng dấu phẩy)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Ghi chú</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>Loại: {resource.kind} · {resource.mimeType}</p>
            <p>Nguồn: {resource.objectType === 'manual' ? 'Thủ công' : resource.objectType === 'workflow' ? 'Workflow' : 'AI Agent'}</p>
            <p>Cập nhật: {new Date(resource.updatedAt).toLocaleString('vi-VN')}</p>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t">
          <div className="flex gap-2">
            <button
              onClick={() => exportResource(resource.id)}
              className="inline-flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm font-medium hover:bg-accent transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Xuất file
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Xoá
            </button>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            Lưu
          </button>
        </div>
      </div>
    </div>
  )
}
