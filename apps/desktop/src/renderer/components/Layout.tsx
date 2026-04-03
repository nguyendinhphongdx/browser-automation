import { NavLink } from 'react-router-dom'
import { useEffect } from 'react'
import {
  Users,
  Play,
  Database,
  ShoppingBag,
  Settings,
  Globe,
  User,
  LogOut,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import { useAuthStore } from '@/stores/auth-store'

const navItems = [
  { to: '/profiles', labelKey: 'nav.profiles', icon: Users },
  { to: '/automation', labelKey: 'nav.automation', icon: Play },
  { to: '/resources', labelKey: 'nav.resources', icon: Database },
  { to: '/marketplace', labelKey: 'nav.marketplace', icon: ShoppingBag },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings }
]

export function Layout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n()
  const { user, isLoggedIn, checkAuth, logout, syncProfiles } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [])

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-60 border-r bg-card flex flex-col">
        {/* Logo */}
        <div className="h-14 flex items-center gap-2 px-4 border-b">
          <Globe className="h-6 w-6 text-primary" />
          <span className="font-semibold text-lg">BrowserAuto</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>

        {/* Account & Footer */}
        <div className="p-3 border-t space-y-2">
          {isLoggedIn && user ? (
            <div className="px-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{user.name || user.email}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={syncProfiles}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium rounded-md border hover:bg-accent transition-colors"
                  title="Đồng bộ profiles"
                >
                  <RefreshCw className="h-3 w-3" />
                  Sync
                </button>
                <button
                  onClick={logout}
                  className="flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium rounded-md border hover:bg-destructive/10 hover:text-destructive transition-colors"
                  title="Đăng xuất"
                >
                  <LogOut className="h-3 w-3" />
                </button>
              </div>
            </div>
          ) : (
            <NavLink
              to="/account"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              <User className="h-4 w-4" />
              Đăng nhập / Đăng ký
            </NavLink>
          )}
          <div className="px-3 py-1 text-xs text-muted-foreground">
            v0.2.0
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </main>
    </div>
  )
}
