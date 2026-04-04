import { useState, useEffect, useCallback } from 'react'
import { Activity, CheckCircle2, XCircle, Clock, Image } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HistoryItem {
  id: string
  workflowId: string
  workflowName: string
  profileId: string
  status: string
  startedAt: string
  finishedAt?: string
  nodeCount: number
  failedNodes: number
  totalTimeMs: number
}

interface Props {
  workflowId?: string
}

export function ExecutionHistory({ workflowId }: Props) {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const limit = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await window.api.getExecutionHistory({
        workflowId,
        status: statusFilter || undefined,
        limit,
        offset: page * limit,
      })
      setItems(res.items || [])
      setTotal(res.total || 0)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [workflowId, statusFilter, page])

  useEffect(() => { load() }, [load])

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
    })

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Activity className="h-4 w-4" />
          Lịch sử chạy
          <span className="text-xs font-normal text-muted-foreground">({total})</span>
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(0) }}
          className="px-2 py-1 text-xs border rounded-md bg-background"
        >
          <option value="">Tất cả</option>
          <option value="completed">Thành công</option>
          <option value="error">Lỗi</option>
          <option value="running">Đang chạy</option>
        </select>
      </div>

      {loading && <div className="text-xs text-muted-foreground py-2">Đang tải...</div>}

      <div className="space-y-1.5">
        {items.map(item => (
          <div key={item.id} className="border rounded-lg px-3 py-2.5 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {item.status === 'completed' ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                ) : item.status === 'error' ? (
                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                ) : (
                  <Clock className="h-3.5 w-3.5 text-amber-500 animate-spin" />
                )}
                <span className="text-xs font-medium truncate max-w-[180px]">
                  {item.workflowName}
                </span>
              </div>
              <span className={cn(
                'text-[10px] font-medium px-1.5 py-0.5 rounded',
                item.status === 'completed' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                item.status === 'error' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                item.status === 'running' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
              )}>
                {item.status}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span>{formatDate(item.startedAt)}</span>
              <span>{item.nodeCount} nodes</span>
              {item.failedNodes > 0 && (
                <span className="text-red-500">{item.failedNodes} failed</span>
              )}
              {item.totalTimeMs > 0 && (
                <span>{formatTime(item.totalTimeMs)}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {!loading && items.length === 0 && (
        <div className="text-xs text-muted-foreground py-6 text-center">
          Chưa có lịch sử chạy
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-2 py-1 text-xs border rounded-md disabled:opacity-30 hover:bg-accent"
          >
            Trước
          </button>
          <span className="text-[10px] text-muted-foreground">
            {page * limit + 1}–{Math.min((page + 1) * limit, total)} / {total}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={(page + 1) * limit >= total}
            className="px-2 py-1 text-xs border rounded-md disabled:opacity-30 hover:bg-accent"
          >
            Sau
          </button>
        </div>
      )}
    </div>
  )
}
