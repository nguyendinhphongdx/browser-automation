import { useEffect, useState } from 'react'
import {
  Plus, Trash2, Play, Square, Copy, Rocket, Settings2,
  Users, GitBranch, ChevronRight, Clock, CheckCircle2, XCircle, Loader2
} from 'lucide-react'
import { useCampaignStore, DEFAULT_EXECUTION } from '@/stores/campaign-store'
import { useWorkflowStore } from '@/stores/workflow-store'
import { useProfileStore } from '@/stores/profile-store'
import { cn } from '@/lib/utils'
import { CampaignEditor } from './CampaignEditor'
import { CampaignRunner } from './CampaignRunner'
import type { CampaignStatus } from '@shared/types'

const STATUS_CONFIG: Record<CampaignStatus, { label: string; color: string; icon: any }> = {
  draft: { label: 'Nháp', color: 'text-gray-500', icon: Settings2 },
  running: { label: 'Đang chạy', color: 'text-blue-500', icon: Loader2 },
  paused: { label: 'Tạm dừng', color: 'text-yellow-500', icon: Clock },
  completed: { label: 'Hoàn thành', color: 'text-green-500', icon: CheckCircle2 },
  error: { label: 'Lỗi', color: 'text-red-500', icon: XCircle },
}

function CreateCampaignDialog({ onClose }: { onClose: () => void }) {
  const { createCampaign } = useCampaignStore()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      await createCampaign({
        name: name.trim(),
        profileIds: [],
        workflowIds: [],
        execution: DEFAULT_EXECUTION
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
          <h2 className="text-lg font-semibold">Tạo chiến dịch mới</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-accent transition-colors text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Tên chiến dịch <span className="text-destructive">*</span></label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="VD: Auto farm Facebook"
              required autoFocus
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-accent transition-colors">Huỷ</button>
            <button type="submit" disabled={loading || !name.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {loading ? 'Đang tạo...' : 'Tạo chiến dịch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function CampaignPage() {
  const {
    campaigns, activeCampaign, isRunning, loading,
    fetchCampaigns, setCampaign, deleteCampaign, duplicateCampaign
  } = useCampaignStore()
  const { fetchWorkflows } = useWorkflowStore()
  const { fetchProfiles } = useProfileStore()
  const [showCreate, setShowCreate] = useState(false)
  const [view, setView] = useState<'editor' | 'runner'>('editor')

  useEffect(() => {
    fetchCampaigns()
    fetchWorkflows()
    fetchProfiles()
  }, [])

  const handleDelete = async () => {
    if (!activeCampaign) return
    if (confirm(`Xoá chiến dịch "${activeCampaign.name}"?`)) {
      await deleteCampaign(activeCampaign.id)
    }
  }

  return (
    <div className="flex h-full">
      {/* Sidebar — Campaign List */}
      <div className="w-72 border-r bg-card flex flex-col">
        <div className="p-3 border-b">
          <button onClick={() => setShowCreate(true)}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> Tạo chiến dịch
          </button>
        </div>

        <div className="flex-1 overflow-auto p-2 space-y-1">
          {campaigns.map(c => {
            const statusCfg = STATUS_CONFIG[c.status]
            const StatusIcon = statusCfg.icon

            return (
              <button key={c.id} onClick={() => setCampaign(c.id)}
                className={cn(
                  'w-full text-left px-3 py-3 rounded-lg text-sm transition-colors',
                  activeCampaign?.id === c.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent'
                )}>
                <div className="flex items-center gap-2">
                  <Rocket className="h-4 w-4 shrink-0" />
                  <span className="font-medium truncate flex-1">{c.name}</span>
                </div>
                <div className="flex items-center gap-3 mt-1.5 ml-6 text-xs">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> {c.profileIds.length}
                  </span>
                  <span className="flex items-center gap-1">
                    <GitBranch className="h-3 w-3" /> {c.workflowIds.length}
                  </span>
                  <span className={cn('flex items-center gap-1 ml-auto', statusCfg.color)}>
                    <StatusIcon className={cn('h-3 w-3', c.status === 'running' && 'animate-spin')} />
                    {statusCfg.label}
                  </span>
                </div>
              </button>
            )
          })}

          {campaigns.length === 0 && !loading && (
            <div className="text-center text-muted-foreground text-sm py-12">
              <Rocket className="h-10 w-10 mx-auto mb-3 opacity-30" />
              Chưa có chiến dịch
            </div>
          )}
        </div>
      </div>

      {/* Main Area */}
      {activeCampaign ? (
        <div className="flex-1 flex flex-col">
          {/* Top bar */}
          <div className="h-14 border-b flex items-center justify-between px-5 bg-card">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold">{activeCampaign.name}</h2>
              <span className={cn(
                'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                activeCampaign.status === 'draft' && 'bg-gray-100 text-gray-600',
                activeCampaign.status === 'running' && 'bg-blue-100 text-blue-600',
                activeCampaign.status === 'completed' && 'bg-green-100 text-green-600',
                activeCampaign.status === 'error' && 'bg-red-100 text-red-600',
              )}>
                {STATUS_CONFIG[activeCampaign.status].label}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex border rounded-lg overflow-hidden">
                <button onClick={() => setView('editor')}
                  className={cn('px-3 py-1.5 text-xs font-medium transition-colors',
                    view === 'editor' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}>
                  <Settings2 className="h-3.5 w-3.5 inline mr-1" /> Cấu hình
                </button>
                <button onClick={() => setView('runner')}
                  className={cn('px-3 py-1.5 text-xs font-medium transition-colors',
                    view === 'runner' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}>
                  <Play className="h-3.5 w-3.5 inline mr-1" /> Chạy
                </button>
              </div>

              <button onClick={() => duplicateCampaign(activeCampaign.id)}
                className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors" title="Nhân bản">
                <Copy className="h-4 w-4" />
              </button>
              <button onClick={handleDelete}
                className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Xoá">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            {view === 'editor' ? <CampaignEditor /> : <CampaignRunner />}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Rocket className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <h2 className="text-xl font-semibold text-foreground">Chiến dịch</h2>
            <p className="text-sm mt-2">Chạy workflow trên nhiều profile cùng lúc</p>
            <button onClick={() => setShowCreate(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              <Plus className="h-4 w-4" /> Tạo chiến dịch đầu tiên
            </button>
          </div>
        </div>
      )}

      {showCreate && <CreateCampaignDialog onClose={() => setShowCreate(false)} />}
    </div>
  )
}
