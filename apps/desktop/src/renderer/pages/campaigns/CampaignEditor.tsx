import { useState } from 'react'
import {
  Users, GitBranch, Settings2, Plus, X, Search,
  Shuffle, ListOrdered, Zap, Timer, Shield, TrendingUp,
  ChevronDown, ChevronUp, Info
} from 'lucide-react'
import { useCampaignStore } from '@/stores/campaign-store'
import { useWorkflowStore } from '@/stores/workflow-store'
import { useProfileStore } from '@/stores/profile-store'
import { cn } from '@/lib/utils'
import type { CampaignExecution } from '@shared/types'

function Section({ title, icon: Icon, children, badge }: {
  title: string; icon: any; children: React.ReactNode; badge?: string | number
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border rounded-xl bg-card">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-accent/50 transition-colors rounded-t-xl">
        <Icon className="h-5 w-5 text-primary" />
        <span className="font-semibold text-sm flex-1 text-left">{title}</span>
        {badge !== undefined && (
          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">{badge}</span>
        )}
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-5 pb-5 pt-2">{children}</div>}
    </div>
  )
}

function NumberRange({ label, value, onChange, unit = 'ms' }: {
  label: string; value: { min: number; max: number }; onChange: (v: { min: number; max: number }) => void; unit?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5 text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2">
        <input type="number" value={value.min} onChange={e => onChange({ ...value, min: Number(e.target.value) })}
          className="w-24 px-2 py-1.5 border rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
        <span className="text-xs text-muted-foreground">~</span>
        <input type="number" value={value.max} onChange={e => onChange({ ...value, max: Number(e.target.value) })}
          className="w-24 px-2 py-1.5 border rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
    </div>
  )
}

export function CampaignEditor() {
  const { activeCampaign, updateCampaign } = useCampaignStore()
  const { workflows } = useWorkflowStore()
  const { profiles } = useProfileStore()
  const [profileSearch, setProfileSearch] = useState('')
  const [workflowSearch, setWorkflowSearch] = useState('')

  if (!activeCampaign) return null

  const exec = activeCampaign.execution
  const selectedProfiles = activeCampaign.profileIds
  const selectedWorkflows = activeCampaign.workflowIds

  const updateExec = (partial: Partial<CampaignExecution>) => {
    updateCampaign(activeCampaign.id, {
      execution: { ...exec, ...partial }
    })
  }

  const toggleProfile = (id: string) => {
    const ids = selectedProfiles.includes(id)
      ? selectedProfiles.filter(p => p !== id)
      : [...selectedProfiles, id]
    updateCampaign(activeCampaign.id, { profileIds: ids })
  }

  const toggleWorkflow = (id: string) => {
    const ids = selectedWorkflows.includes(id)
      ? selectedWorkflows.filter(w => w !== id)
      : [...selectedWorkflows, id]
    updateCampaign(activeCampaign.id, { workflowIds: ids })
  }

  const selectAllProfiles = () => {
    updateCampaign(activeCampaign.id, { profileIds: profiles.map(p => p.id) })
  }

  const deselectAllProfiles = () => {
    updateCampaign(activeCampaign.id, { profileIds: [] })
  }

  const filteredProfiles = profiles.filter(p =>
    p.name.toLowerCase().includes(profileSearch.toLowerCase())
  )
  const filteredWorkflows = workflows.filter(w =>
    w.name.toLowerCase().includes(workflowSearch.toLowerCase())
  )

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      {/* Campaign name & description */}
      <div className="space-y-3">
        <input
          type="text"
          value={activeCampaign.name}
          onChange={e => updateCampaign(activeCampaign.id, { name: e.target.value })}
          className="text-xl font-bold bg-transparent border-none outline-none w-full placeholder:text-muted-foreground"
          placeholder="Tên chiến dịch"
        />
        <input
          type="text"
          value={activeCampaign.description}
          onChange={e => updateCampaign(activeCampaign.id, { description: e.target.value })}
          className="text-sm text-muted-foreground bg-transparent border-none outline-none w-full placeholder:text-muted-foreground"
          placeholder="Mô tả chiến dịch (tuỳ chọn)"
        />
      </div>

      {/* Profiles */}
      <Section title="Profiles" icon={Users} badge={selectedProfiles.length}>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input type="text" value={profileSearch} onChange={e => setProfileSearch(e.target.value)}
                placeholder="Tìm profile..." className="w-full pl-8 pr-3 py-1.5 border rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <button onClick={selectAllProfiles} className="text-xs text-primary hover:underline whitespace-nowrap">Chọn tất cả</button>
            <button onClick={deselectAllProfiles} className="text-xs text-muted-foreground hover:underline whitespace-nowrap">Bỏ chọn</button>
          </div>

          <div className="max-h-48 overflow-auto border rounded-lg divide-y">
            {filteredProfiles.map(p => (
              <label key={p.id} className="flex items-center gap-3 px-3 py-2 hover:bg-accent/50 cursor-pointer transition-colors">
                <input type="checkbox" checked={selectedProfiles.includes(p.id)}
                  onChange={() => toggleProfile(p.id)} className="rounded w-4 h-4" />
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color || '#3B82F6' }} />
                <span className="text-xs font-medium flex-1">{p.name}</span>
                <span className="text-[10px] text-muted-foreground">{p.browserType}</span>
              </label>
            ))}
            {filteredProfiles.length === 0 && (
              <div className="px-3 py-4 text-xs text-muted-foreground text-center">Không tìm thấy profile</div>
            )}
          </div>
        </div>
      </Section>

      {/* Workflows */}
      <Section title="Kịch bản" icon={GitBranch} badge={selectedWorkflows.length}>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input type="text" value={workflowSearch} onChange={e => setWorkflowSearch(e.target.value)}
              placeholder="Tìm workflow..." className="w-full pl-8 pr-3 py-1.5 border rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          <div className="max-h-48 overflow-auto border rounded-lg divide-y">
            {filteredWorkflows.map(w => (
              <label key={w.id} className="flex items-center gap-3 px-3 py-2 hover:bg-accent/50 cursor-pointer transition-colors">
                <input type="checkbox" checked={selectedWorkflows.includes(w.id)}
                  onChange={() => toggleWorkflow(w.id)} className="rounded w-4 h-4" />
                <GitBranch className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs font-medium flex-1">{w.name}</span>
                <span className="text-[10px] text-muted-foreground">{w.nodes.length} node</span>
              </label>
            ))}
            {filteredWorkflows.length === 0 && (
              <div className="px-3 py-4 text-xs text-muted-foreground text-center">Không tìm thấy workflow</div>
            )}
          </div>
        </div>
      </Section>

      {/* Execution Config */}
      <Section title="Cấu hình thực thi" icon={Settings2}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          {/* Mode */}
          <div>
            <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Chế độ chạy</label>
            <div className="flex gap-2">
              <button onClick={() => updateExec({ mode: 'parallel' })}
                className={cn('flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors',
                  exec.mode === 'parallel' ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-accent')}>
                <Zap className="h-3.5 w-3.5 inline mr-1" /> Song song
              </button>
              <button onClick={() => updateExec({ mode: 'sequential' })}
                className={cn('flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors',
                  exec.mode === 'sequential' ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-accent')}>
                <ListOrdered className="h-3.5 w-3.5 inline mr-1" /> Tuần tự
              </button>
            </div>
          </div>

          {/* Max concurrent */}
          {exec.mode === 'parallel' && (
            <div>
              <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Tối đa đồng thời</label>
              <input type="number" min={1} max={50} value={exec.maxConcurrent}
                onChange={e => updateExec({ maxConcurrent: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          )}

          {/* Workflow order */}
          <div>
            <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Thứ tự kịch bản</label>
            <select value={exec.workflowOrder}
              onChange={e => updateExec({ workflowOrder: e.target.value as any })}
              className="w-full px-3 py-2 border rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="sequential">Tuần tự (1 → 2 → 3)</option>
              <option value="random">Ngẫu nhiên (chọn 1)</option>
              <option value="shuffle">Xáo trộn thứ tự</option>
            </select>
          </div>

          {/* Profile order */}
          <div>
            <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Thứ tự profile</label>
            <select value={exec.profileOrder}
              onChange={e => updateExec({ profileOrder: e.target.value as any })}
              className="w-full px-3 py-2 border rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="sequential">Theo thứ tự</option>
              <option value="random">Ngẫu nhiên</option>
            </select>
          </div>

          {/* Delay between profiles */}
          <NumberRange label="Delay giữa mỗi profile" value={exec.delayBetweenProfiles}
            onChange={v => updateExec({ delayBetweenProfiles: v })} />

          {/* Repeat */}
          <div>
            <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Lặp lại (0 = 1 lần)</label>
            <input type="number" min={0} value={exec.repeatCount}
              onChange={e => updateExec({ repeatCount: Number(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          {exec.repeatCount > 0 && (
            <NumberRange label="Delay giữa mỗi lần lặp" value={exec.repeatDelay}
              onChange={v => updateExec({ repeatDelay: v })} />
          )}

          {/* Error handling */}
          <div>
            <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Retry khi lỗi</label>
            <input type="number" min={0} max={5} value={exec.retryOnError}
              onChange={e => updateExec({ retryOnError: Number(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={exec.stopOnError}
                onChange={e => updateExec({ stopOnError: e.target.checked })}
                className="rounded w-4 h-4" />
              <span className="text-xs font-medium">Dừng khi có lỗi</span>
            </label>
          </div>
        </div>

        {/* Warm-up */}
        <div className="mt-4 pt-4 border-t">
          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <input type="checkbox" checked={exec.warmUp}
              onChange={e => updateExec({ warmUp: e.target.checked })}
              className="rounded w-4 h-4" />
            <TrendingUp className="h-4 w-4 text-orange-500" />
            <span className="text-xs font-medium">Warm-up (tăng dần số profile)</span>
          </label>

          {exec.warmUp && (
            <div className="grid grid-cols-2 gap-4 ml-6">
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Tăng thêm mỗi lần</label>
                <input type="number" min={1} value={exec.warmUpStep}
                  onChange={e => updateExec({ warmUpStep: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Delay warm-up (ms)</label>
                <input type="number" value={exec.warmUpDelay}
                  onChange={e => updateExec({ warmUpDelay: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Summary */}
      <div className="border rounded-xl bg-blue-50 dark:bg-blue-950/20 p-4">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
          <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <p><strong>{selectedProfiles.length}</strong> profile × <strong>{selectedWorkflows.length}</strong> kịch bản
              {exec.repeatCount > 0 && <> × <strong>{exec.repeatCount + 1}</strong> lần</>}
              {' = '}<strong>{selectedProfiles.length * Math.max(selectedWorkflows.length, 1) * (exec.repeatCount + 1)}</strong> lượt chạy
            </p>
            <p>
              Chế độ: <strong>{exec.mode === 'parallel' ? `Song song (tối đa ${exec.maxConcurrent})` : 'Tuần tự'}</strong>
              {' | '}Kịch bản: <strong>{exec.workflowOrder === 'sequential' ? 'Lần lượt' : exec.workflowOrder === 'random' ? 'Ngẫu nhiên' : 'Xáo trộn'}</strong>
              {exec.warmUp && <> | <strong>Warm-up</strong> bật</>}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
