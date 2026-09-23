import { useState } from 'react'
import { Loader2, CheckCircle2, XCircle, ChevronDown, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ToolCallCardProps {
  toolName: string
  status: 'running' | 'done' | 'error'
  argsText: string
  resultText?: string
}

const STATUS_ICON = { running: Loader2, done: CheckCircle2, error: XCircle } as const

export function ToolCallCard({ toolName, status, argsText, resultText }: ToolCallCardProps) {
  const [open, setOpen] = useState(false)
  const StatusIcon = STATUS_ICON[status]

  return (
    <div className="max-w-[85%] rounded-lg border bg-card/50 text-[11px]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-1.5 px-2.5 py-1.5"
      >
        <Wrench className="h-3 w-3 shrink-0 text-muted-foreground" />
        <code className="font-mono font-medium">{toolName}</code>
        <StatusIcon
          className={cn(
            'h-3 w-3 shrink-0',
            status === 'running' && 'animate-spin text-primary',
            status === 'error' && 'text-destructive',
            status === 'done' && 'text-emerald-500'
          )}
        />
        <ChevronDown className={cn('ml-auto h-3 w-3 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="space-y-1.5 border-t px-2.5 py-2 text-muted-foreground">
          {argsText && (
            <div>
              <p className="mb-0.5 font-medium text-foreground/70">Tham số</p>
              <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-muted p-1.5 font-mono">{argsText}</pre>
            </div>
          )}
          {resultText && (
            <div>
              <p className="mb-0.5 font-medium text-foreground/70">Kết quả</p>
              <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-muted p-1.5 font-mono">{resultText}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
