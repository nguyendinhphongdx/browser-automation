import { useEffect, useState } from 'react'
import { Plus, Clapperboard, Trash2, ArrowLeft } from 'lucide-react'
import { useVideoStudioStore } from '@/stores/video-studio-store'
import { VideoStudioCanvas } from './VideoStudioCanvas'

function CreatePipelineDialog({ onClose }: { onClose: () => void }) {
  const { createPipeline } = useVideoStudioStore()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      await createPipeline({ name: name.trim() })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-sm mx-4">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Pipeline video mới</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Vd: Mèo phiêu lưu thành phố neon"
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-accent transition-colors">
              Huỷ
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Tạo
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function VideoStudioPage() {
  const { pipelines, activePipeline, loading, fetchPipelines, fetchNodeDefinitions, setActivePipeline, deletePipeline } =
    useVideoStudioStore()
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    fetchPipelines()
    fetchNodeDefinitions()
  }, [])

  if (activePipeline) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-3 h-12 px-4 border-b shrink-0">
          <button onClick={() => setActivePipeline(null)} className="p-1.5 rounded-md hover:bg-accent transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h2 className="text-sm font-semibold">{activePipeline.name}</h2>
        </div>
        <div className="flex-1 relative overflow-hidden">
          <VideoStudioCanvas />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Video Studio</h1>
          <p className="text-sm text-muted-foreground mt-1">Dựng pipeline tạo video bằng AI — kéo node hoặc nhờ AI dựng sẵn</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Pipeline mới
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">Đang tải...</div>
      ) : pipelines.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Clapperboard className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-lg font-medium">Chưa có pipeline nào</p>
          <p className="text-sm mt-1">Tạo pipeline đầu tiên để bắt đầu</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pipelines.map((p) => (
            <div
              key={p.id}
              onClick={() => setActivePipeline(p.id)}
              className="border rounded-xl p-4 cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-colors group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Clapperboard className="h-4 w-4 text-indigo-500 shrink-0" />
                  <span className="text-sm font-medium truncate">{p.name}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(`Xoá pipeline "${p.name}"?`)) deletePipeline(p.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-destructive/10 hover:text-destructive transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{p.nodes.length} node · {p.status}</p>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreatePipelineDialog onClose={() => setShowCreate(false)} />}
    </div>
  )
}
