import { Bot, User } from 'lucide-react'
import { Streamdown } from 'streamdown'
import { cn } from '@/lib/utils'

interface MessageProps {
  role: 'user' | 'assistant'
  // Mọi caller (AgentChatPanel.tsx) đều truyền chuỗi thô (item.text) — thu
  // hẹp từ ReactNode xuống string để Streamdown (chỉ nhận string markdown,
  // không nhận JSX con) nhận đúng kiểu, không cần ép kiểu ở nơi gọi.
  children: string
  /** Shows a subtle pulsing caret — set while a message is still streaming in. */
  streaming?: boolean
}

export function Message({ role, children, streaming }: MessageProps) {
  return (
    <div className={cn('flex gap-2', role === 'user' ? 'justify-end' : 'justify-start')}>
      {role === 'assistant' && (
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
          <Bot className="h-3 w-3 text-purple-500" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed',
          role === 'user' ? 'bg-primary text-primary-foreground whitespace-pre-wrap' : 'bg-secondary/70'
        )}
      >
        {role === 'assistant' ? (
          // parseIncompleteMarkdown (mặc định true) tự xử lý markdown bị cắt
          // giữa chừng lúc đang stream (vd "**đậm" chưa đóng) — không hiện
          // ký tự ** thô ra màn hình trong lúc chờ phần còn lại.
          <Streamdown className="text-xs leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            {children}
          </Streamdown>
        ) : (
          children
        )}
        {streaming && <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-current align-middle" />}
      </div>
      {role === 'user' && (
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <User className="h-3 w-3 text-primary" />
        </div>
      )}
    </div>
  )
}
