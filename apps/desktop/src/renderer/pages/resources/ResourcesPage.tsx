import { Database } from 'lucide-react'

export function ResourcesPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
      <Database className="h-16 w-16 mb-4 opacity-30" />
      <h2 className="text-xl font-semibold text-foreground">Quản lý tài nguyên</h2>
      <p className="text-sm mt-2">Proxy, Email, Cookie, API Key</p>
      <p className="text-xs mt-1">Sẽ có trong Phase 2</p>
    </div>
  )
}
