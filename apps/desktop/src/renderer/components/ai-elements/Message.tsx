import { Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface MessageProps {
  role: 'user' | 'assistant'
  children: ReactNode
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
          role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary/70'
        )}
      >
        {children}
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
