import { useEffect, useState } from 'react'
import {
  Download, Upload, Search, Star, GitBranch, Code,
  Copy, ShoppingBag, Package, Clock
} from 'lucide-react'
import { useWorkflowStore } from '@/stores/workflow-store'
import { cn } from '@/lib/utils'
import type { Workflow } from '@shared/types'

function WorkflowCard({ workflow, onDuplicate, onExport }: {
  workflow: Workflow
  onDuplicate: (id: string) => void
  onExport: (id: string) => void
}) {
  const nodeCount = workflow.nodes.length
  const updatedDate = new Date(workflow.updatedAt).toLocaleDateString('vi-VN')

  return (
    <div className="border rounded-xl p-5 bg-card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {workflow.mode === 'visual' ? (
            <div className="p-2 bg-purple-100 rounded-lg">
              <GitBranch className="h-4 w-4 text-purple-600" />
            </div>
          ) : (
            <div className="p-2 bg-blue-100 rounded-lg">
              <Code className="h-4 w-4 text-blue-600" />
            </div>
          )}
          <div>
            <h3 className="font-medium text-sm">{workflow.name}</h3>
            <p className="text-xs text-muted-foreground">
              {workflow.mode === 'visual' ? 'Visual' : 'Code'} · v{workflow.version}
            </p>
          </div>
        </div>
        <span className={cn(
          'px-2 py-0.5 rounded-full text-xs font-medium',
          workflow.status === 'ready' ? 'bg-green-100 text-green-700' :
          workflow.status === 'draft' ? 'bg-gray-100 text-gray-600' :
          'bg-yellow-100 text-yellow-700'
        )}>
          {workflow.status === 'ready' ? 'Sẵn sàng' : workflow.status === 'draft' ? 'Nháp' : workflow.status}
        </span>
      </div>

      {workflow.description && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{workflow.description}</p>
      )}

      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
        <div className="flex items-center gap-1">
          <Package className="h-3 w-3" />
          {nodeCount} node{nodeCount !== 1 ? 's' : ''}
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {updatedDate}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => onDuplicate(workflow.id)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-medium hover:bg-accent transition-colors">
          <Copy className="h-3 w-3" /> Nhân đôi
        </button>
        <button onClick={() => onExport(workflow.id)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-medium hover:bg-accent transition-colors">
          <Download className="h-3 w-3" /> Xuất file
        </button>
      </div>
    </div>
  )
}

export function MarketplacePage() {
  const { workflows, fetchWorkflows } = useWorkflowStore()
  const [search, setSearch] = useState('')
  const [filterMode, setFilterMode] = useState<'all' | 'visual' | 'code'>('all')

  useEffect(() => {
    fetchWorkflows()
  }, [])

  const filtered = workflows.filter(wf => {
    const matchesSearch = wf.name.toLowerCase().includes(search.toLowerCase()) ||
      (wf.description || '').toLowerCase().includes(search.toLowerCase())
    const matchesMode = filterMode === 'all' || wf.mode === filterMode
    return matchesSearch && matchesMode
  })

  const handleDuplicate = async (id: string) => {
    try {
      await window.api.duplicateWorkflow(id)
      await fetchWorkflows()
    } catch (err) {
      alert(`Lỗi: ${err}`)
    }
  }

  const handleExport = async (id: string) => {
    try {
      await window.api.exportWorkflow(id)
    } catch (err) {
      alert(`Lỗi: ${err}`)
    }
  }

  const handleImport = async () => {
    try {
      const result = await window.api.importWorkflow()
      if (result) {
        await fetchWorkflows()
        alert('Import workflow thành công!')
      }
    } catch (err) {
      alert(`Lỗi: ${err}`)
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Marketplace</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Chia sẻ và khám phá kịch bản automation · {workflows.length} workflow
          </p>
        </div>
        <button onClick={handleImport}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          <Upload className="h-4 w-4" /> Import Workflow
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Tìm workflow..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="flex items-center border rounded-lg">
          {(['all', 'visual', 'code'] as const).map(mode => (
            <button key={mode} onClick={() => setFilterMode(mode)}
              className={cn(
                'px-3 py-2 text-xs font-medium transition-colors',
                filterMode === mode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}>
              {mode === 'all' ? 'Tất cả' : mode === 'visual' ? 'Visual' : 'Code'}
            </button>
          ))}
        </div>
      </div>

      {/* Community marketplace banner */}
      <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Star className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Community Marketplace</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Marketplace online sẽ sớm ra mắt. Hiện tại bạn có thể xuất/nhập workflow qua file JSON.
            </p>
          </div>
        </div>
      </div>

      {/* Workflow grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <ShoppingBag className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-lg font-medium">Chưa có workflow nào</p>
          <p className="text-sm mt-1">Tạo workflow trong Automation Builder hoặc import từ file</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(wf => (
            <WorkflowCard key={wf.id} workflow={wf} onDuplicate={handleDuplicate} onExport={handleExport} />
          ))}
        </div>
      )}
    </div>
  )
}
