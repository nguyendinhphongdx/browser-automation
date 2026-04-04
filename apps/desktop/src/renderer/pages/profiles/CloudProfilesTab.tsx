import { useEffect, useState } from 'react'
import { Cloud, Download, Trash2, RefreshCw, HardDrive, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import type { BackupStatusItem } from '@shared/types'

const api = window.api

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface CloudBackup {
  id: string
  profileId: string
  name: string
  size: number
  checksum: string
  createdAt: string
}

export function CloudProfilesTab() {
  const { isLoggedIn } = useAuthStore()
  const [backups, setBackups] = useState<CloudBackup[]>([])
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [error, setError] = useState('')

  const fetchBackups = async () => {
    if (!isLoggedIn) return
    setLoading(true)
    setError('')
    try {
      const res = await api.apiRequest('GET', '/api/profiles/backup')
      setBackups(res.backups || [])
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách backup')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBackups()
  }, [isLoggedIn])

  const handleDownload = async (backupId: string) => {
    setDownloading(backupId)
    try {
      await api.downloadBackup(backupId)
      // Refresh local profiles
      window.dispatchEvent(new CustomEvent('profiles:refresh'))
    } catch (err: any) {
      setError(err.message || 'Download thất bại')
    } finally {
      setDownloading(null)
    }
  }

  const handleDelete = async (backupId: string) => {
    if (!confirm('Bạn có chắc muốn xóa backup này khỏi cloud?')) return
    try {
      await api.apiRequest('DELETE', `/api/profiles/backup/${backupId}`)
      setBackups((prev) => prev.filter((b) => b.id !== backupId))
    } catch (err: any) {
      setError(err.message || 'Xóa thất bại')
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Cloud className="h-12 w-12 mb-3 opacity-40" />
        <p className="text-lg font-medium">Đăng nhập để xem Cloud Profiles</p>
        <p className="text-sm mt-1">Kết nối tài khoản để backup và đồng bộ profiles</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {backups.length} backup trên cloud
        </p>
        <button
          onClick={fetchBackups}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border hover:bg-accent transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading && backups.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          Đang tải...
        </div>
      ) : backups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <HardDrive className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-lg font-medium">Chưa có backup nào</p>
          <p className="text-sm mt-1">Upload profile từ tab Local để backup lên cloud</p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Tên
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Dung lượng
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Ngày backup
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => (
                <tr key={backup.id} className="border-b hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Cloud className="h-4 w-4 text-blue-500" />
                      <span className="font-medium text-sm">{backup.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatSize(backup.size)}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatDate(backup.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDownload(backup.id)}
                        disabled={downloading === backup.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
                        title="Download về máy"
                      >
                        {downloading === backup.id ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        {downloading === backup.id ? 'Đang tải...' : 'Download'}
                      </button>
                      <button
                        onClick={() => handleDelete(backup.id)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Xóa backup"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
