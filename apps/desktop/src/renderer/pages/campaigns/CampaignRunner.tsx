import { useState, useEffect, useCallback } from 'react'
import {
  Play, Square, Pause, PlayCircle,
  CheckCircle2, XCircle, Loader2, Clock, AlertTriangle,
  ChevronDown, ChevronRight, User, GitBranch
} from 'lucide-react'
import { useCampaignStore } from '@/stores/campaign-store'
import { useProfileStore } from '@/stores/profile-store'
import { useWorkflowStore } from '@/stores/workflow-store'
import { cn } from '@/lib/utils'
import type { CampaignProfileResult } from '@shared/types'

const RESULT_STATUS = {
  pending: { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-100', label: 'Chờ' },
  running: { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-100', label: 'Đang chạy' },
  completed: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-100', label: 'Hoàn thành' },
  error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100', label: 'Lỗi' },
  skipped: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-100', label: 'Bỏ qua' },
}

function ResultRow({ result }: { result: CampaignProfileResult }) {
  const [expanded, setExpanded] = useState(false)
  const status = RESULT_STATUS[result.status]
  const StatusIcon = status.icon

  const duration = result.startedAt && result.finishedAt
    ? Math.round((new Date(result.finishedAt).getTime() - new Date(result.startedAt).getTime()) / 1000)
    : null

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
          result.status === 'running' && 'bg-blue-50 dark:bg-blue-950/20',
          result.status === 'error' && 'bg-red-50 dark:bg-red-950/20',
        )}
      >
        <StatusIcon className={cn('h-4 w-4 shrink-0', status.color, result.status === 'running' && 'animate-spin')} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <User className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-medium truncate">{result.profileName}</span>
            <span className="text-muted-foreground text-[10px]">→</span>
            <GitBranch className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs truncate text-muted-foreground">{result.workflowName}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {duration !== null && (
            <span className="text-[10px] text-muted-foreground font-mono">{duration}s</span>
          )}
          <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', status.bg, status.color)}>
            {status.label}
          </span>
          {result.logs.length > 0 && (
            expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && result.logs.length > 0 && (
        <div className="bg-[#1e1e1e] max-h-32 overflow-auto px-3 py-2">
          {result.logs.map((log, i) => (
            <div key={i} className="flex items-start gap-2 text-[10px] font-mono py-0.5">
              <span className="text-gray-500 shrink-0">
                {new Date(log.timestamp).toLocaleTimeString('vi-VN')}
              </span>
              <span className={cn(
                log.level === 'error' ? 'text-red-400' :
                log.level === 'warn' ? 'text-yellow-400' : 'text-gray-300'
              )}>
                {log.message}
              </span>
            </div>
          ))}
          {result.error && (
            <div className="text-[10px] text-red-400 font-mono mt-1 pt-1 border-t border-gray-700">
              Error: {result.error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function CampaignRunner() {
  const { activeCampaign, isRunning, profileResults, setRunning, setProfileResults, fetchRuns, fetchCampaigns } = useCampaignStore()
  const [isPaused, setIsPaused] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)

  // Listen for campaign events
  useEffect(() => {
    const onResults = (results: CampaignProfileResult[]) => {
      setProfileResults(results)
    }
    const onProfileProgress = (result: CampaignProfileResult) => {
      const current = useCampaignStore.getState().profileResults
      const updated = current.map(r =>
        r.profileId === result.profileId && r.workflowId === result.workflowId ? result : r
      )
      setProfileResults(updated)
    }
    const onStatus = (data: { campaignId: string; status: string }) => {
      if (data.status !== 'running') {
        setRunning(false)
        setIsPaused(false)
        setStartTime(null)
        if (activeCampaign) {
          fetchRuns(activeCampaign.id)
          fetchCampaigns()
        }
      }
    }

    window.api.on('campaign:results', onResults)
    window.api.on('campaign:profile-progress', onProfileProgress)
    window.api.on('campaign:status', onStatus)

    return () => {
      window.api.off('campaign:results', onResults)
      window.api.off('campaign:profile-progress', onProfileProgress)
      window.api.off('campaign:status', onStatus)
    }
  }, [activeCampaign])

  // Timer
  useEffect(() => {
    if (!isRunning || !startTime) return
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [isRunning, startTime])

  if (!activeCampaign) return null

  const hasConfig = activeCampaign.profileIds.length > 0 && activeCampaign.workflowIds.length > 0

  // Stats
  const total = profileResults.length
  const completed = profileResults.filter(r => r.status === 'completed').length
  const errors = profileResults.filter(r => r.status === 'error').length
  const running = profileResults.filter(r => r.status === 'running').length
  const pending = profileResults.filter(r => r.status === 'pending').length
  const skipped = profileResults.filter(r => r.status === 'skipped').length
  const progress = total > 0 ? Math.round(((completed + errors + skipped) / total) * 100) : 0

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const handleStart = async () => {
    try {
      setRunning(true)
      setProfileResults([])
      setStartTime(Date.now())
      setElapsed(0)
      await window.api.runCampaign(activeCampaign.id)
    } catch (err: any) {
      alert(`Lỗi: ${err.message || err}`)
      setRunning(false)
    }
  }

  const handleStop = () => {
    window.api.stopCampaign(activeCampaign.id)
  }

  const handlePause = () => {
    window.api.pauseCampaign(activeCampaign.id)
    setIsPaused(true)
  }

  const handleResume = () => {
    window.api.resumeCampaign(activeCampaign.id)
    setIsPaused(false)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-5">
      {/* Controls */}
      <div className="flex items-center gap-3">
        {!isRunning ? (
          <button onClick={handleStart} disabled={!hasConfig}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
            <Play className="h-4 w-4" /> Bắt đầu chiến dịch
          </button>
        ) : (
          <>
            {isPaused ? (
              <button onClick={handleResume}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                <PlayCircle className="h-4 w-4" /> Tiếp tục
              </button>
            ) : (
              <button onClick={handlePause}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors">
                <Pause className="h-4 w-4" /> Tạm dừng
              </button>
            )}
            <button onClick={handleStop}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors">
              <Square className="h-4 w-4" /> Dừng
            </button>
          </>
        )}

        {isRunning && (
          <span className="text-xs text-muted-foreground font-mono">
            {formatTime(elapsed)}
          </span>
        )}

        {!hasConfig && !isRunning && (
          <span className="text-xs text-muted-foreground">Cần chọn ít nhất 1 profile và 1 kịch bản trong tab Cấu hình</span>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">{progress}% hoàn thành</span>
            <div className="flex items-center gap-3 text-muted-foreground">
              <span className="text-green-600">{completed} OK</span>
              <span className="text-red-600">{errors} lỗi</span>
              <span className="text-blue-600">{running} chạy</span>
              <span>{pending} chờ</span>
            </div>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <div className="h-full flex transition-all">
              <div className="bg-green-500" style={{ width: `${total ? (completed / total) * 100 : 0}%` }} />
              <div className="bg-red-500" style={{ width: `${total ? (errors / total) * 100 : 0}%` }} />
              <div className="bg-blue-500 animate-pulse" style={{ width: `${total ? (running / total) * 100 : 0}%` }} />
              <div className="bg-yellow-400" style={{ width: `${total ? (skipped / total) * 100 : 0}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Stats cards */}
      {total > 0 && (
        <div className="grid grid-cols-5 gap-3">
          <div className="border rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{total}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Tổng</div>
          </div>
          <div className="border rounded-xl p-3 text-center bg-green-50 dark:bg-green-950/20">
            <div className="text-2xl font-bold text-green-600">{completed}</div>
            <div className="text-[10px] text-green-600 mt-0.5">Thành công</div>
          </div>
          <div className="border rounded-xl p-3 text-center bg-red-50 dark:bg-red-950/20">
            <div className="text-2xl font-bold text-red-600">{errors}</div>
            <div className="text-[10px] text-red-600 mt-0.5">Lỗi</div>
          </div>
          <div className="border rounded-xl p-3 text-center bg-blue-50 dark:bg-blue-950/20">
            <div className="text-2xl font-bold text-blue-600">{running}</div>
            <div className="text-[10px] text-blue-600 mt-0.5">Đang chạy</div>
          </div>
          <div className="border rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-muted-foreground">{pending}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Đang chờ</div>
          </div>
        </div>
      )}

      {/* Charts */}
      {total > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <DonutChart
            title="Kết quả"
            data={[
              { label: 'Thành công', value: completed, color: '#22c55e' },
              { label: 'Lỗi', value: errors, color: '#ef4444' },
              { label: 'Đang chạy', value: running, color: '#3b82f6' },
              { label: 'Bỏ qua', value: skipped, color: '#eab308' },
              { label: 'Đang chờ', value: pending, color: '#d1d5db' },
            ]}
          />
          <TimelineChart results={profileResults} />
        </div>
      )}

      {/* Results list */}
      {profileResults.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Chi tiết từng profile</h3>
          <div className="space-y-1.5">
            {profileResults.map((result, i) => (
              <ResultRow key={`${result.profileId}-${result.workflowId}-${i}`} result={result} />
            ))}
          </div>
        </div>
      ) : (
        !isRunning && (
          <div className="border-2 border-dashed rounded-xl p-12 text-center">
            <Play className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="text-sm text-muted-foreground">
              {hasConfig
                ? 'Bấm "Bắt đầu chiến dịch" để chạy'
                : 'Chuyển sang tab Cấu hình để chọn profiles và kịch bản'
              }
            </p>
          </div>
        )
      )}

      {/* Run History */}
      <RunHistory />
    </div>
  )
}

// ── Charts ─────────────────────────────────────

function DonutChart({ title, data }: { title: string; data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  if (total === 0) return null

  const size = 140
  const stroke = 20
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="border rounded-xl p-4">
      <h4 className="text-xs font-semibold mb-3">{title}</h4>
      <div className="flex items-center gap-4">
        <svg width={size} height={size} className="shrink-0">
          {data.filter(d => d.value > 0).map((d, i) => {
            const pct = d.value / total
            const dashArray = `${circumference * pct} ${circumference * (1 - pct)}`
            const dashOffset = -offset * circumference
            offset += pct
            return (
              <circle
                key={i}
                cx={size / 2} cy={size / 2} r={radius}
                fill="none" stroke={d.color} strokeWidth={stroke}
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                className="transition-all duration-500"
                style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
              />
            )
          })}
          <text x={size / 2} y={size / 2 - 6} textAnchor="middle" className="fill-foreground text-2xl font-bold">{total}</text>
          <text x={size / 2} y={size / 2 + 12} textAnchor="middle" className="fill-muted-foreground text-[10px]">lượt chạy</text>
        </svg>

        <div className="space-y-1.5">
          {data.filter(d => d.value > 0).map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-[11px] text-muted-foreground">{d.label}</span>
              <span className="text-[11px] font-semibold ml-auto">{d.value}</span>
              <span className="text-[10px] text-muted-foreground w-8 text-right">
                {Math.round((d.value / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TimelineChart({ results }: { results: CampaignProfileResult[] }) {
  const finished = results.filter(r => r.startedAt && r.finishedAt)
  if (finished.length === 0) {
    return (
      <div className="border rounded-xl p-4">
        <h4 className="text-xs font-semibold mb-3">Thời gian thực thi</h4>
        <div className="h-[120px] flex items-center justify-center text-xs text-muted-foreground">
          Chưa có dữ liệu
        </div>
      </div>
    )
  }

  // Tính duration cho mỗi task (giây)
  const durations = finished.map(r => ({
    label: r.profileName.length > 12 ? r.profileName.slice(0, 12) + '...' : r.profileName,
    duration: Math.round((new Date(r.finishedAt!).getTime() - new Date(r.startedAt!).getTime()) / 1000),
    status: r.status,
  }))

  const maxDuration = Math.max(...durations.map(d => d.duration), 1)
  const barHeight = 18
  const gap = 4
  const chartHeight = Math.min(durations.length * (barHeight + gap), 160)
  const chartWidth = 280

  return (
    <div className="border rounded-xl p-4">
      <h4 className="text-xs font-semibold mb-3">Thời gian thực thi</h4>
      <div className="overflow-auto" style={{ maxHeight: 160 }}>
        <svg width="100%" height={durations.length * (barHeight + gap)} viewBox={`0 0 ${chartWidth} ${durations.length * (barHeight + gap)}`}>
          {durations.map((d, i) => {
            const y = i * (barHeight + gap)
            const barW = Math.max((d.duration / maxDuration) * (chartWidth - 80), 4)
            const color = d.status === 'completed' ? '#22c55e' : d.status === 'error' ? '#ef4444' : '#3b82f6'

            return (
              <g key={i}>
                <text x={0} y={y + barHeight / 2 + 4} className="fill-muted-foreground" fontSize={9}>
                  {d.label}
                </text>
                <rect x={75} y={y + 2} width={barW} height={barHeight - 4} rx={4} fill={color} opacity={0.8} />
                <text x={75 + barW + 4} y={y + barHeight / 2 + 3} className="fill-muted-foreground" fontSize={9}>
                  {d.duration}s
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

function RunHistory() {
  const { runs } = useCampaignStore()

  if (runs.length === 0) return null

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Lịch sử chạy</h3>
      <div className="border rounded-lg divide-y">
        {runs.slice(0, 10).map(run => {
          const results = run.profileResults || []
          const completed = results.filter(r => r.status === 'completed').length
          const errors = results.filter(r => r.status === 'error').length
          const StatusIcon = run.status === 'completed' ? CheckCircle2
            : run.status === 'error' ? XCircle : Loader2
          const statusColor = run.status === 'completed' ? 'text-green-500'
            : run.status === 'error' ? 'text-red-500' : 'text-blue-500'

          const duration = run.startedAt && run.finishedAt
            ? Math.round((new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)
            : null

          return (
            <div key={run.id} className="flex items-center gap-3 px-4 py-2.5">
              <StatusIcon className={cn('h-4 w-4 shrink-0', statusColor)} />
              <span className="text-xs text-muted-foreground flex-1">
                {new Date(run.startedAt).toLocaleString('vi-VN')}
              </span>
              {duration !== null && (
                <span className="text-[10px] text-muted-foreground font-mono">{duration}s</span>
              )}
              <span className="text-[10px] text-green-600">{completed} OK</span>
              {errors > 0 && <span className="text-[10px] text-red-600">{errors} lỗi</span>}
              <span className="text-[10px] text-muted-foreground">{results.length} lượt</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
