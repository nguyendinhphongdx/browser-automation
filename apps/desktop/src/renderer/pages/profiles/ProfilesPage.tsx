import { useEffect, useState } from 'react'
import { Plus, LayoutGrid, LayoutList, Search, Play, Square, Trash2, Edit, Copy, Users } from 'lucide-react'
import { useProfileStore } from '@/stores/profile-store'
import { useResourceStore } from '@/stores/resource-store'
import { cn } from '@/lib/utils'
import { CreateProfileDialog } from './CreateProfileDialog'
import { EditProfileDialog } from './EditProfileDialog'
import type { BrowserProfile } from '@shared/types'

const BROWSER_ICONS: Record<string, string> = {
  chrome: '🌐',
  brave: '🦁',
  edge: '📘',
  firefox: '🦊',
  opera: '🔴',
  vivaldi: '🎨',
  chromium: '⚡',
  custom: '🔧'
}

function ProfileTableRow({ profile, getProxyName, onEdit }: { profile: BrowserProfile; getProxyName: (id: string | null) => string; onEdit: (p: BrowserProfile) => void }) {
  const { launchBrowser, closeBrowser, deleteProfile, duplicateProfile, runningProfiles } = useProfileStore()
  const isRunning = runningProfiles.has(profile.id)

  return (
    <tr className="border-b hover:bg-muted/50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: profile.color }}
          />
          <span className="font-medium">{profile.name}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm">
        <span className="inline-flex items-center gap-1">
          {BROWSER_ICONS[profile.browserType] || '🌐'}
          {profile.browserType}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {profile.fingerprint?.platform || '—'}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {getProxyName(profile.proxyId)}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        <div className="flex flex-wrap gap-1">
          {profile.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-secondary rounded-full text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {profile.lastUsed
          ? new Date(profile.lastUsed).toLocaleDateString('vi-VN')
          : 'Chưa dùng'}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          {isRunning ? (
            <button
              onClick={() => closeBrowser(profile.id)}
              className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors"
              title="Dừng trình duyệt"
            >
              <Square className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => launchBrowser(profile.id)}
              className="p-1.5 rounded-md hover:bg-green-500/10 text-green-600 transition-colors"
              title="Khởi chạy trình duyệt"
            >
              <Play className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => onEdit(profile)}
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors"
            title="Chỉnh sửa"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => duplicateProfile(profile.id)}
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors"
            title="Nhân đôi"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              if (confirm('Bạn có chắc muốn xoá profile này?')) {
                deleteProfile(profile.id)
              }
            }}
            className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            title="Xoá"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}

function ProfileGridCard({ profile, getProxyName, onEdit }: { profile: BrowserProfile; getProxyName: (id: string | null) => string; onEdit: (p: BrowserProfile) => void }) {
  const { launchBrowser, closeBrowser, deleteProfile, duplicateProfile, runningProfiles } = useProfileStore()
  const isRunning = runningProfiles.has(profile.id)

  return (
    <div className="border rounded-xl p-4 bg-card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: profile.color }}
          />
          <h3 className="font-medium text-sm">{profile.name}</h3>
        </div>
        {isRunning && (
          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            Đang chạy
          </span>
        )}
      </div>

      <div className="space-y-1.5 text-xs text-muted-foreground mb-4">
        <div className="flex justify-between">
          <span>Trình duyệt</span>
          <span className="font-medium text-foreground">
            {BROWSER_ICONS[profile.browserType]} {profile.browserType}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Platform</span>
          <span>{profile.fingerprint?.platform || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span>Proxy</span>
          <span>{getProxyName(profile.proxyId)}</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {isRunning ? (
          <button
            onClick={() => closeBrowser(profile.id)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors"
          >
            <Square className="h-3 w-3" />
            Dừng
          </button>
        ) : (
          <button
            onClick={() => launchBrowser(profile.id)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-600 text-xs font-medium hover:bg-green-500/20 transition-colors"
          >
            <Play className="h-3 w-3" />
            Khởi chạy
          </button>
        )}
        <button
          onClick={() => onEdit(profile)}
          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
          title="Chỉnh sửa"
        >
          <Edit className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => duplicateProfile(profile.id)}
          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
          title="Nhân đôi"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => {
            if (confirm('Bạn có chắc muốn xoá profile này?')) {
              deleteProfile(profile.id)
            }
          }}
          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

export function ProfilesPage() {
  const { profiles, viewMode, setViewMode, fetchProfiles, fetchBrowsers, loading } =
    useProfileStore()
  const { proxies, fetchProxies } = useResourceStore()
  const [showCreate, setShowCreate] = useState(false)
  const [editingProfile, setEditingProfile] = useState<BrowserProfile | null>(null)
  const [search, setSearch] = useState('')

  const getProxyName = (proxyId: string | null) => {
    if (!proxyId) return 'Không có'
    const proxy = proxies.find(p => p.id === proxyId)
    return proxy ? proxy.name : proxyId
  }

  useEffect(() => {
    fetchProfiles()
    fetchBrowsers()
    fetchProxies()
  }, [])

  const filtered = profiles.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Profiles</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quản lý {profiles.length} browser profile
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Tạo Profile
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm kiếm profile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex items-center border rounded-lg">
          <button
            onClick={() => setViewMode('table')}
            className={cn(
              'p-2 transition-colors',
              viewMode === 'table'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <LayoutList className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-2 transition-colors',
              viewMode === 'grid'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          Đang tải...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Users className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-lg font-medium">Chưa có profile nào</p>
          <p className="text-sm mt-1">Tạo profile đầu tiên để bắt đầu</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Tạo Profile
          </button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Tên
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Trình duyệt
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Platform
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Proxy
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Tags
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Lần dùng cuối
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((profile) => (
                <ProfileTableRow key={profile.id} profile={profile} getProxyName={getProxyName} onEdit={setEditingProfile} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((profile) => (
            <ProfileGridCard key={profile.id} profile={profile} getProxyName={getProxyName} onEdit={setEditingProfile} />
          ))}
        </div>
      )}

      {/* Create dialog */}
      {showCreate && <CreateProfileDialog onClose={() => setShowCreate(false)} />}
      {/* Edit dialog */}
      {editingProfile && (
        <EditProfileDialog profile={editingProfile} onClose={() => setEditingProfile(null)} />
      )}
    </div>
  )
}
