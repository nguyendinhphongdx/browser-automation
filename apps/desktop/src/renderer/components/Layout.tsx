import { NavLink } from 'react-router-dom'
import {
  Users,
  Play,
  Database,
  ShoppingBag,
  Settings,
  Globe
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/profiles', label: 'Profiles', icon: Users },
  { to: '/automation', label: 'Automation', icon: Play },
  { to: '/resources', label: 'Tài nguyên', icon: Database },
  { to: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
  { to: '/settings', label: 'Cài đặt', icon: Settings }
]

export function Layout({ children }: { children: React.ReactNode }) {
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
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t">
          <div className="px-3 py-2 text-xs text-muted-foreground">
            v0.1.0 — Phase 1
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
