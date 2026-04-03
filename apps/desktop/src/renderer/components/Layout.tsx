import { NavLink, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  Users,
  Play,
  Rocket,
  Database,
  ShoppingBag,
  Settings,
  Globe,
  User,
  LogOut,
  RefreshCw,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import { useAuthStore } from '@/stores/auth-store'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

const navItems = [
  { to: '/profiles', labelKey: 'nav.profiles', icon: Users },
  { to: '/automation', labelKey: 'nav.automation', icon: Play },
  { to: '/campaigns', labelKey: 'nav.campaigns', icon: Rocket },
  { to: '/resources', labelKey: 'nav.resources', icon: Database },
  { to: '/marketplace', labelKey: 'nav.marketplace', icon: ShoppingBag },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings }
]

export function Layout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n()
  const { user, isLoggedIn, checkAuth, logout, syncProfiles } = useAuthStore()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  useKeyboardShortcuts()

  useEffect(() => {
    checkAuth()
  }, [])

  // Auto collapse khi vào trang automation, expand khi rời
  useEffect(() => {
    setCollapsed(location.pathname.startsWith('/automation') || location.pathname.startsWith('/campaigns'))
  }, [location.pathname])

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className={cn(
        'border-r bg-card flex flex-col transition-all duration-300',
        collapsed ? 'w-14' : 'w-60'
      )}>
        {/* Logo */}
        <div className="h-14 flex items-center gap-2 px-4 border-b overflow-hidden">
          <Globe className="h-6 w-6 text-primary shrink-0" />
          {!collapsed && <span className="font-semibold text-lg whitespace-nowrap">BrowserAuto</span>}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? t(item.labelKey) : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg text-sm font-medium transition-colors',
                  collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">{t(item.labelKey)}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Toggle button */}
        <div className="px-2 py-1">
          <button
            onClick={() => setCollapsed(c => !c)}
            className="w-full flex items-center justify-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-accent transition-colors"
            title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        {/* Account & Footer */}
        <div className="p-2 border-t space-y-2">
          {isLoggedIn && user ? (
            <div className={collapsed ? 'flex flex-col items-center gap-1' : 'px-2'}>
              {!collapsed && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{user.name || user.email}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
              )}
              {collapsed ? (
                <>
                  <button
                    onClick={syncProfiles}
                    className="flex items-center justify-center p-1.5 rounded-md border hover:bg-accent transition-colors"
                    title="Đồng bộ profiles"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={logout}
                    className="flex items-center justify-center p-1.5 rounded-md border hover:bg-destructive/10 hover:text-destructive transition-colors"
                    title="Đăng xuất"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
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
              )}
            </div>
          ) : (
            <NavLink
              to="/account"
              title={collapsed ? 'Đăng nhập / Đăng ký' : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg text-sm font-medium transition-colors',
                  collapsed ? 'justify-center px-0 py-2' : 'px-3 py-2',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              <User className="h-4 w-4 shrink-0" />
              {!collapsed && 'Đăng nhập / Đăng ký'}
            </NavLink>
          )}
          {!collapsed && (
            <div className="px-3 py-1 text-xs text-muted-foreground">
              v0.2.0
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  )
}
