import { useEffect, useRef, useState } from 'react'
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
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      // Step 1: mount (ở vị trí translate-x-full)
      setMounted(true)
      // Step 2: next frame → slide in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true)
        })
      })
    } else {
      // Step 1: slide out
      setVisible(false)
      // Step 2: unmount sau animation
      const timer = setTimeout(() => setMounted(false), 300)
      return () => clearTimeout(timer)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!mounted) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 z-40 transition-opacity duration-300 ${
          visible ? 'bg-black/5 opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`absolute top-0 right-0 z-50 h-full bg-card border-l shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width }}
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

        {/* Content */}
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
