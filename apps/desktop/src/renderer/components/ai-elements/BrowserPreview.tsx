import { Loader2, MonitorOff, Radio } from 'lucide-react'
import type { BrowserPreviewStatus } from '@/pages/automation/agent/use-browser-preview'

interface Props {
  status: BrowserPreviewStatus
  frame: string | null
  message: string | null
}

export function BrowserPreview({ status, frame, message }: Props) {
  return (
    <div className="relative aspect-video w-full shrink-0 overflow-hidden border-b bg-black">
      {frame ? (
        <img src={frame} alt="Xem trực tiếp trình duyệt" className="h-full w-full object-contain" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-4 text-muted-foreground">
          {status === 'starting' && <Loader2 className="h-5 w-5 animate-spin" />}
          {status === 'unavailable' && <MonitorOff className="h-5 w-5" />}
          <p className="max-w-[240px] text-center text-[10px] leading-relaxed">
            {status === 'unavailable'
              ? message
              : status === 'starting'
                ? 'Đang kết nối tới trình duyệt...'
                : 'Chưa có trình duyệt đang mở'}
          </p>
        </div>
      )}
      {status === 'live' && (
        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
          <Radio className="h-2.5 w-2.5 animate-pulse text-red-500" />
          Live
        </div>
      )}
    </div>
  )
}
