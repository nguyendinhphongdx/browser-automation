import { Sun, Moon, Monitor, Globe, Info, Keyboard, Shield, Database } from 'lucide-react'
import { useThemeStore } from '@/stores/theme-store'
import { useI18n, type Locale } from '@/lib/i18n'
import { cn } from '@/lib/utils'

type Theme = 'light' | 'dark' | 'system'

const THEME_OPTIONS: { value: Theme; label: string; icon: any }[] = [
  { value: 'light', label: 'Sáng', icon: Sun },
  { value: 'dark', label: 'Tối', icon: Moon },
  { value: 'system', label: 'Hệ thống', icon: Monitor }
]

const SHORTCUTS = [
  { keys: ['Ctrl', 'N'], description: 'Tạo profile mới' },
  { keys: ['Ctrl', 'S'], description: 'Lưu workflow' },
  { keys: ['Ctrl', 'Shift', 'R'], description: 'Chạy workflow' },
  { keys: ['Ctrl', 'F'], description: 'Tìm kiếm' },
  { keys: ['Ctrl', ','], description: 'Mở cài đặt' },
  { keys: ['Delete'], description: 'Xoá node đã chọn' }
]

function SettingSection({ title, icon: Icon, children }: {
  title: string; icon: any; children: React.ReactNode
}) {
  return (
    <div className="border rounded-xl p-5 bg-card">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  )
}

export function SettingsPage() {
  const { theme, setTheme } = useThemeStore()
  const { locale, setLocale } = useI18n()

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Cài đặt</h1>
        <p className="text-sm text-muted-foreground mt-1">Tuỳ chỉnh ứng dụng</p>
      </div>

      <div className="space-y-4">
        {/* Theme */}
        <SettingSection title="Giao diện" icon={Sun}>
          <div className="grid grid-cols-3 gap-3">
            {THEME_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setTheme(opt.value)}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border text-sm font-medium transition-colors',
                  theme === opt.value
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:bg-accent'
                )}>
                <opt.icon className="h-5 w-5" />
                {opt.label}
              </button>
            ))}
          </div>
        </SettingSection>

        {/* Language */}
        <SettingSection title="Ngôn ngữ" icon={Globe}>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setLocale('vi')}
              className={cn('flex items-center gap-3 p-3 rounded-lg border text-sm font-medium transition-colors',
                locale === 'vi' ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-accent text-muted-foreground')}>
              <span className="text-lg">🇻🇳</span> Tiếng Việt
            </button>
            <button onClick={() => setLocale('en')}
              className={cn('flex items-center gap-3 p-3 rounded-lg border text-sm font-medium transition-colors',
                locale === 'en' ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-accent text-muted-foreground')}>
              <span className="text-lg">🇺🇸</span> English
            </button>
          </div>
        </SettingSection>

        {/* Keyboard shortcuts */}
        <SettingSection title="Phím tắt" icon={Keyboard}>
          <div className="space-y-2">
            {SHORTCUTS.map((shortcut, i) => (
              <div key={i} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, j) => (
                    <span key={j}>
                      <kbd className="px-2 py-1 bg-secondary rounded text-xs font-mono font-medium">{key}</kbd>
                      {j < shortcut.keys.length - 1 && <span className="text-muted-foreground mx-0.5">+</span>}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SettingSection>

        {/* Data */}
        <SettingSection title="Dữ liệu" icon={Database}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Mã hoá dữ liệu</p>
                <p className="text-xs text-muted-foreground">Mật khẩu proxy và email được mã hoá AES-256-GCM</p>
              </div>
              <div className="flex items-center gap-1.5 text-green-600">
                <Shield className="h-4 w-4" />
                <span className="text-xs font-medium">Đang bật</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Cơ sở dữ liệu</p>
                <p className="text-xs text-muted-foreground">SQLite lưu cục bộ với WAL mode</p>
              </div>
              <span className="text-xs text-muted-foreground">browser-automation.db</span>
            </div>
          </div>
        </SettingSection>

        {/* About */}
        <SettingSection title="Thông tin" icon={Info}>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phiên bản</span>
              <span className="font-medium">0.2.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Framework</span>
              <span>Electron + React + TypeScript</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Browser Engine</span>
              <span>Playwright Core</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Database</span>
              <span>SQLite (better-sqlite3)</span>
            </div>
          </div>
        </SettingSection>
      </div>
    </div>
  )
}
