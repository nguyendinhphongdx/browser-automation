import { ShieldAlert, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ApprovalCardProps {
  toolName: string
  input: unknown
  reason?: string
  status: 'pending' | 'approved' | 'denied'
  onRespond: (approved: boolean) => void
}

/** Human-in-the-loop gate for approval-required tools (e.g. run_js) — the
 * whole reason this is a real agent and not a one-shot chat completion. */
export function ApprovalCard({ toolName, input, reason, status, onRespond }: ApprovalCardProps) {
  return (
    <div className="max-w-[85%] rounded-lg border border-amber-400/50 bg-amber-400/10 p-2.5 text-[11px]">
      <div className="mb-1.5 flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
        <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
        Cần bạn duyệt trước khi chạy
      </div>
      <p className="mb-1.5 text-muted-foreground">
        AI muốn chạy <code className="font-mono">{toolName}</code>
        {reason ? ` — ${reason}` : ''}
      </p>
      <pre className="mb-2 overflow-x-auto whitespace-pre-wrap rounded bg-black/5 p-1.5 text-muted-foreground dark:bg-white/5">
        {JSON.stringify(input, null, 2)}
      </pre>
      {status === 'pending' ? (
        <div className="flex gap-2">
          <button
            onClick={() => onRespond(true)}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-md bg-emerald-500 px-2 py-1 font-medium text-white transition-colors hover:bg-emerald-600"
          >
            <Check className="h-3 w-3" />
            Cho phép
          </button>
          <button
            onClick={() => onRespond(false)}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-md border px-2 py-1 font-medium transition-colors hover:bg-accent"
          >
            <X className="h-3 w-3" />
            Từ chối
          </button>
        </div>
      ) : (
        <p
          className={cn(
            'flex items-center gap-1 font-medium',
            status === 'approved' ? 'text-emerald-600' : 'text-destructive'
          )}
        >
          {status === 'approved' ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
          {status === 'approved' ? 'Đã cho phép' : 'Đã từ chối'}
        </p>
      )}
    </div>
  )
}
