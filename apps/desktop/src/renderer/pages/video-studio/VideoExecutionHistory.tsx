import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronRight } from 'lucide-react'
import { Drawer } from '@/components/Drawer'
import type { VideoPipelineRun, LogEntry } from '@shared/types'

// video-studio:run (IPC thủ công) ghi logs dạng LogEntry[]; run_video_pipeline
// (AI tool) ghi logs dạng string[] thuần (xem run-video-pipeline.ts) — cùng 1
// cột `logs` TEXT nhưng 2 hình dạng khác nhau tuỳ nơi chạy, nên render phải
// chấp nhận cả 2 thay vì giả định 1 shape cố định.
function formatLogEntry(entry: string | LogEntry): string {
  if (typeof entry === 'string') return entry
  return `[${entry.level}] ${entry.message}`
}

function RunRow({ run }: { run: VideoPipelineRun }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = run.status === 'completed' ? CheckCircle : run.status === 'error' ? XCircle : Clock
  const color = run.status === 'completed' ? 'text-green-500' : run.status === 'error' ? 'text-red-500' : 'text-blue-500 animate-spin'
  const statusColor = run.status === 'completed' ? 'text-green-400' : run.status === 'error' ? 'text-red-400' : 'text-blue-400'

  let entries: (string | LogEntry)[] = []
  try {
    entries = JSON.parse(run.logs)
  } catch {
    entries = []
  }

  return (
    <div className="border-b border-gray-800">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors"
      >
        {expanded ? <ChevronDown className="h-3 w-3 shrink-0 text-gray-500" /> : <ChevronRight className="h-3 w-3 shrink-0 text-gray-500" />}
        <Icon className={`h-3 w-3 shrink-0 ${color}`} />
        <span className="text-gray-400">{new Date(run.startedAt).toLocaleString('vi-VN')}</span>
        <span className={`ml-auto ${statusColor}`}>{run.status}</span>
      </button>
      {expanded && (
        <div className="bg-[#1e1e1e] py-1">
          {entries.length > 0 ? (
            entries.map((entry, i) => (
              <div key={i} className="px-3 py-0.5 text-xs font-mono text-gray-200">
                {formatLogEntry(entry)}
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-xs text-gray-500">Không có log</div>
          )}
        </div>
      )}
    </div>
  )
}

export function VideoExecutionHistory({
  open, onClose, pipelineId
}: { open: boolean; onClose: () => void; pipelineId: string | null }) {
  const [runs, setRuns] = useState<VideoPipelineRun[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !pipelineId) return
    setLoading(true)
    window.api.getVideoPipelineRuns(pipelineId)
      .then((rows: VideoPipelineRun[]) => setRuns(rows))
      .finally(() => setLoading(false))
  }, [open, pipelineId])

  return (
    <Drawer open={open} onClose={onClose} title="Lịch sử chạy" width={360}>
      <div className="flex flex-col h-full bg-[#1e1e1e]">
        {loading ? (
          <div className="text-center text-gray-500 text-xs py-8">Đang tải...</div>
        ) : runs.length > 0 ? (
          <div className="flex-1 overflow-auto">
            {runs.map((run) => <RunRow key={run.id} run={run} />)}
          </div>
        ) : (
          <div className="text-center text-gray-500 text-xs py-8">
            Chưa có lần chạy nào. Bấm &quot;Chạy pipeline&quot; để xem lịch sử ở đây.
          </div>
        )}
      </div>
    </Drawer>
  )
}
