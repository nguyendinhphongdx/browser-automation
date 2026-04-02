import { Settings } from 'lucide-react'

export function SettingsPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
      <Settings className="h-16 w-16 mb-4 opacity-30" />
      <h2 className="text-xl font-semibold text-foreground">Cài đặt</h2>
      <p className="text-sm mt-2">Cấu hình ứng dụng</p>
      <p className="text-xs mt-1">Sẽ có trong Phase 5</p>
    </div>
  )
}
