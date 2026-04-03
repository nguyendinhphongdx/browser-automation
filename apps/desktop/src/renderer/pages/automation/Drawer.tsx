import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  width?: number
}

export function Drawer({ open, onClose, title, children, width = 360 }: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="absolute inset-0 z-40 bg-black/5"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="absolute top-0 right-0 z-50 h-full bg-card border-l shadow-2xl flex flex-col transition-transform duration-300 ease-out"
        style={{
          width,
          transform: open ? 'translateX(0)' : `translateX(${width}px)`,
          visibility: open ? 'visible' : 'hidden',
        }}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 h-12 border-b shrink-0">
            <h3 className="text-sm font-semibold">{title}</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-accent transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Content — nếu không có title, children tự quản lý layout */}
        {title ? (
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        ) : (
          children
        )}
      </div>
    </>
  )
}
