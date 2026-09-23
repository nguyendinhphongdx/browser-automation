import { useState } from 'react'
import { Brain, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReasoningBlockProps {
  text: string
  streaming: boolean
}

/** Collapsed-by-default "thinking" disclosure — reasoning text is often long
 * and is secondary to the actual answer, so it stays out of the way until
 * the user asks to see it. */
export function ReasoningBlock({ text, streaming }: ReasoningBlockProps) {
  const [open, setOpen] = useState(false)
  if (!text && !streaming) return null

  return (
    <div className="max-w-[85%] rounded-lg border border-dashed bg-muted/30 text-[11px]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-1.5 px-2.5 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        <Brain className={cn('h-3 w-3 shrink-0', streaming && 'animate-pulse text-primary')} />
        <span className="font-medium">{streaming ? 'Đang suy nghĩ...' : 'Quá trình suy luận'}</span>
        <ChevronDown className={cn('ml-auto h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="whitespace-pre-wrap px-2.5 pb-2 leading-relaxed text-muted-foreground">{text}</div>
      )}
    </div>
  )
}
