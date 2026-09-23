import { useEffect, useRef, type ReactNode } from 'react'

interface ConversationProps {
  children: ReactNode
}

/**
 * Scrollable message-list container with auto-scroll-to-bottom. Own file
 * (mirrors AI Elements' `Conversation` component) so the panel's layout
 * plumbing stays separate from message rendering.
 */
export function Conversation({ children }: ConversationProps) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  })

  return (
    <div className="flex-1 overflow-auto p-3 space-y-2.5">
      {children}
      <div ref={endRef} />
    </div>
  )
}
