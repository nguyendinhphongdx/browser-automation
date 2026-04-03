import { useWorkflowStore } from '@/stores/workflow-store'
import { CheckCircle, XCircle, AlertTriangle, Info, Clock } from 'lucide-react'
import { Drawer } from './Drawer'
import type { LogEntry } from '@shared/types'

const LOG_ICONS: Record<string, any> = {
  info: Info,
  warn: AlertTriangle,
  error: XCircle,
  debug: Clock
}

const LOG_COLORS: Record<string, string> = {
  info: 'text-blue-400',
  warn: 'text-yellow-400',
  error: 'text-red-400',
  debug: 'text-gray-400'
}

function LogLine({ entry }: { entry: LogEntry }) {
  const Icon = LOG_ICONS[entry.level] || Info
  const color = LOG_COLORS[entry.level] || 'text-gray-400'
  const time = new Date(entry.timestamp).toLocaleTimeString('vi-VN')

  return (
    <div className="flex items-start gap-2 px-3 py-1 hover:bg-white/5 text-xs font-mono">
      <Icon className={`h-3 w-3 mt-0.5 shrink-0 ${color}`} />
      <span className="text-gray-500 shrink-0">{time}</span>
      {entry.nodeId && (
        <span className="text-purple-400 shrink-0">[{entry.nodeId.substring(0, 8)}]</span>
      )}
      <span className="text-gray-200">{entry.message}</span>
    </div>
  )
}

export function ExecutionPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { executionLogs, logs, isRunning } = useWorkflowStore()

  return (
    <Drawer open={open} onClose={onClose} title={isRunning ? '⏳ Đang chạy...' : 'Execution Logs'} width={360}>
      <div className="flex flex-col h-full bg-[#1e1e1e]">
        {/* Current execution logs */}
        <div className="flex-1 overflow-auto">
          {executionLogs.length > 0 ? (
            <div className="py-1">
              {executionLogs.map((entry, i) => (
                <LogLine key={i} entry={entry} />
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 text-xs py-8">
              Chưa có log. Chạy workflow để xem kết quả.
            </div>
          )}
        </div>

        {/* History */}
        {logs.length > 0 && (
          <div className="border-t border-gray-700">
            <div className="px-3 py-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Lịch sử</h3>
            </div>
            <div className="max-h-40 overflow-auto">
              {logs.map(log => (
                <div key={log.id} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                  {log.status === 'completed' ? (
                    <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                  ) : log.status === 'error' ? (
                    <XCircle className="h-3 w-3 text-red-500 shrink-0" />
                  ) : (
                    <Clock className="h-3 w-3 text-blue-500 shrink-0 animate-spin" />
                  )}
                  <span className="text-gray-400">
                    {new Date(log.startedAt).toLocaleString('vi-VN')}
                  </span>
                  <span className={`ml-auto ${log.status === 'completed' ? 'text-green-400' : log.status === 'error' ? 'text-red-400' : 'text-blue-400'}`}>
                    {log.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Drawer>
  )
}
