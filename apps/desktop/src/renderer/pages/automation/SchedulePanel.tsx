import { useState, useEffect, useCallback } from 'react'
import { Plus, Clock, Webhook, Link2, Play, Trash2, ToggleLeft, ToggleRight, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Schedule, Workflow } from '@shared/types'

const CRON_PRESETS = [
  { label: 'Mỗi 30 phút', value: '*/30 * * * *' },
  { label: 'Mỗi giờ', value: '0 * * * *' },
  { label: 'Mỗi ngày 8AM', value: '0 8 * * *' },
  { label: 'Mỗi ngày 2AM', value: '0 2 * * *' },
  { label: 'Thứ 2 hàng tuần', value: '0 9 * * 1' },
  { label: 'Tùy chỉnh', value: '' },
]

export function SchedulePanel() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [webhookPort, setWebhookPort] = useState(0)
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async () => {
    const [s, w, p] = await Promise.all([
      window.api.getSchedules(),
      window.api.getWorkflows(),
      window.api.getWebhookPort(),
    ])
    setSchedules(s || [])
    setWorkflows(w || [])
    setWebhookPort(p || 0)
  }, [])

  useEffect(() => { load() }, [load])

  const handleToggle = async (id: string, enabled: boolean) => {
    await window.api.toggleSchedule(id, !enabled)
    await load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa schedule này?')) return
    await window.api.deleteSchedule(id)
    await load()
  }

  const handleTrigger = async (id: string) => {
    try {
      await window.api.triggerSchedule(id)
      alert('Đã trigger thành công!')
    } catch (err: any) {
      alert('Lỗi: ' + err.message)
    }
  }

  const copyWebhookUrl = (secret: string) => {
    const url = `http://127.0.0.1:${webhookPort}?secret=${secret}`
    navigator.clipboard.writeText(url)
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Schedules & Triggers</h3>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          <Plus className="h-3 w-3" /> Tạo mới
        </button>
      </div>

      {schedules.length === 0 && (
        <div className="text-xs text-muted-foreground text-center py-6">
          Chưa có schedule. Tạo mới để tự động chạy workflow.
        </div>
      )}

      <div className="space-y-2">
        {schedules.map(s => {
          const wf = workflows.find(w => w.id === s.targetId)
          const TypeIcon = s.type === 'cron' ? Clock : s.type === 'webhook' ? Webhook : Link2

          return (
            <div key={s.id} className={cn(
              'border rounded-lg px-3 py-2.5 space-y-1.5',
              !s.enabled && 'opacity-50'
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TypeIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">{s.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleTrigger(s.id)} title="Chạy ngay"
                    className="p-1 rounded hover:bg-accent"><Play className="h-3 w-3" /></button>
                  <button onClick={() => handleToggle(s.id, s.enabled)} title={s.enabled ? 'Tắt' : 'Bật'}
                    className="p-1 rounded hover:bg-accent">
                    {s.enabled ? <ToggleRight className="h-3.5 w-3.5 text-green-500" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => handleDelete(s.id)} title="Xóa"
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3 w-3" /></button>
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground space-y-0.5">
                <div>→ {wf?.name || s.targetId}</div>
                {s.type === 'cron' && <div>Cron: <code className="bg-secondary px-1 rounded">{s.cronExpression}</code></div>}
                {s.type === 'webhook' && s.webhookSecret && (
                  <div className="flex items-center gap-1">
                    URL: <code className="bg-secondary px-1 rounded truncate max-w-[200px]">
                      http://127.0.0.1:{webhookPort}?secret={s.webhookSecret.slice(0, 8)}...
                    </code>
                    <button onClick={() => copyWebhookUrl(s.webhookSecret!)}
                      className="p-0.5 rounded hover:bg-accent"><Copy className="h-2.5 w-2.5" /></button>
                  </div>
                )}
                {s.type === 'chain' && (
                  <div>Sau: {workflows.find(w => w.id === s.chainSourceId)?.name || s.chainSourceId} ({s.chainOnStatus})</div>
                )}
                {s.nextRunAt && <div>Tiếp: {new Date(s.nextRunAt).toLocaleString('vi-VN')}</div>}
                {s.lastTriggeredAt && <div>Lần cuối: {new Date(s.lastTriggeredAt).toLocaleString('vi-VN')}</div>}
              </div>
            </div>
          )
        })}
      </div>

      {showCreate && (
        <CreateScheduleDialog
          workflows={workflows}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load() }}
        />
      )}
    </div>
  )
}

function CreateScheduleDialog({ workflows, onClose, onCreated }: {
  workflows: Workflow[]
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [type, setType] = useState<'cron' | 'webhook' | 'chain'>('cron')
  const [targetId, setTargetId] = useState('')
  const [profileId, setProfileId] = useState('')
  const [cronExpression, setCronExpression] = useState('0 * * * *')
  const [cronPreset, setCronPreset] = useState('0 * * * *')
  const [chainSourceId, setChainSourceId] = useState('')
  const [chainOnStatus, setChainOnStatus] = useState<'completed' | 'error' | 'any'>('completed')
  const [loading, setLoading] = useState(false)

  const handlePreset = (value: string) => {
    setCronPreset(value)
    if (value) setCronExpression(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !targetId) return
    setLoading(true)
    try {
      await window.api.createSchedule({
        name, type, targetType: 'workflow', targetId,
        profileId: profileId || undefined,
        cronExpression: type === 'cron' ? cronExpression : undefined,
        chainSourceId: type === 'chain' ? chainSourceId : undefined,
        chainOnStatus: type === 'chain' ? chainOnStatus : undefined,
      })
      onCreated()
    } catch (err: any) {
      alert('Lỗi: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="text-sm font-semibold">Tạo Schedule</h3>
          <button onClick={onClose} className="text-lg text-muted-foreground hover:text-foreground">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1">Tên</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required
              placeholder="VD: Auto scrape mỗi giờ"
              className="w-full px-3 py-2 border rounded-lg bg-background text-xs" />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Loại trigger</label>
            <div className="grid grid-cols-3 gap-2">
              {(['cron', 'webhook', 'chain'] as const).map(t => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={cn('px-3 py-2 rounded-lg border text-xs font-medium',
                    type === t ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-accent')}>
                  {t === 'cron' ? 'Đặt lịch' : t === 'webhook' ? 'Webhook' : 'Chain'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Workflow</label>
            <select value={targetId} onChange={e => setTargetId(e.target.value)} required
              className="w-full px-3 py-2 border rounded-lg bg-background text-xs">
              <option value="">-- Chọn workflow --</option>
              {workflows.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>

          {type === 'cron' && (
            <div className="space-y-2">
              <label className="block text-xs font-medium">Lịch chạy</label>
              <select value={cronPreset} onChange={e => handlePreset(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-background text-xs">
                {CRON_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <input type="text" value={cronExpression} onChange={e => setCronExpression(e.target.value)}
                placeholder="min hour day month weekday"
                className="w-full px-3 py-2 border rounded-lg bg-background text-xs font-mono" />
            </div>
          )}

          {type === 'chain' && (
            <div className="space-y-2">
              <label className="block text-xs font-medium">Chạy sau workflow</label>
              <select value={chainSourceId} onChange={e => setChainSourceId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-background text-xs">
                <option value="">-- Chọn workflow nguồn --</option>
                {workflows.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <select value={chainOnStatus} onChange={e => setChainOnStatus(e.target.value as any)}
                className="w-full px-3 py-2 border rounded-lg bg-background text-xs">
                <option value="completed">Khi thành công</option>
                <option value="error">Khi lỗi</option>
                <option value="any">Luôn luôn</option>
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 border rounded-lg text-xs font-medium hover:bg-accent">Hủy</button>
            <button type="submit" disabled={loading || !name || !targetId}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50">
              {loading ? 'Đang tạo...' : 'Tạo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
