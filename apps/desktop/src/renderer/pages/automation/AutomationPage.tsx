import { Play } from 'lucide-react'

export function AutomationPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
      <Play className="h-16 w-16 mb-4 opacity-30" />
      <h2 className="text-xl font-semibold text-foreground">Automation Builder</h2>
      <p className="text-sm mt-2">Xây dựng kịch bản tự động hoá bằng code hoặc kéo thả</p>
      <p className="text-xs mt-1">Sẽ có trong Phase 3</p>
    </div>
  )
}
