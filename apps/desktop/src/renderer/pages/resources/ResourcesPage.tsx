import { useEffect } from 'react'
import { Wifi, Mail, Cookie } from 'lucide-react'
import { useResourceStore } from '@/stores/resource-store'
import { cn } from '@/lib/utils'
import { ProxyTab } from './ProxyTab'
import { EmailTab } from './EmailTab'
import { CookieTab } from './CookieTab'

const TABS = [
  { key: 'proxy' as const, label: 'Proxy', icon: Wifi },
  { key: 'email' as const, label: 'Email / Account', icon: Mail },
  { key: 'cookie' as const, label: 'Cookie', icon: Cookie }
]

export function ResourcesPage() {
  const { activeTab, setActiveTab, fetchProxies, fetchEmails, fetchCookies } = useResourceStore()

  useEffect(() => {
    fetchProxies()
    fetchEmails()
    fetchCookies()
  }, [])

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Tài nguyên</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Quản lý proxy, email, cookie
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'proxy' && <ProxyTab />}
      {activeTab === 'email' && <EmailTab />}
      {activeTab === 'cookie' && <CookieTab />}
    </div>
  )
}
