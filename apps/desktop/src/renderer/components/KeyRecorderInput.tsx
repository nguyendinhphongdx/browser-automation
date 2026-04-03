import { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

function formatKey(e: KeyboardEvent): string {
  const parts: string[] = []

  if (e.ctrlKey || e.metaKey) parts.push('Control')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')

  // Bỏ qua modifier keys đứng riêng
  const key = e.key
  if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
    // Map tên phím cho dễ đọc
    const keyMap: Record<string, string> = {
      ' ': 'Space',
      'ArrowUp': 'ArrowUp',
      'ArrowDown': 'ArrowDown',
      'ArrowLeft': 'ArrowLeft',
      'ArrowRight': 'ArrowRight',
      'Backspace': 'Backspace',
      'Delete': 'Delete',
      'Enter': 'Enter',
      'Escape': 'Escape',
      'Tab': 'Tab',
      'Home': 'Home',
      'End': 'End',
      'PageUp': 'PageUp',
      'PageDown': 'PageDown',
    }
    const mapped = keyMap[key] || (key.length === 1 ? key.toLowerCase() : key)
    parts.push(mapped)
  }

  return parts.join('+')
}

export function KeyRecorderInput({ value, onChange, placeholder }: Props) {
  const [recording, setRecording] = useState(false)
  const inputRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const formatted = formatKey(e.nativeEvent)
    // Chỉ cập nhật khi có phím thực (không chỉ modifier)
    if (!['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
      onChange(formatted)
    }
  }, [onChange])

  const keys = value ? value.split('+') : []

  return (
    <div
      ref={inputRef}
      tabIndex={0}
      onFocus={() => setRecording(true)}
      onBlur={() => setRecording(false)}
      onKeyDown={handleKeyDown}
      className={cn(
        'w-full min-h-[38px] px-3 py-2 border rounded-lg bg-background text-xs cursor-pointer transition-all flex items-center gap-1.5 flex-wrap',
        recording
          ? 'ring-2 ring-primary border-primary'
          : 'hover:border-foreground/30',
        !value && !recording && 'text-muted-foreground'
      )}
    >
      {recording && !value && (
        <span className="text-muted-foreground animate-pulse">Nhấn phím...</span>
      )}
      {!recording && !value && (
        <span className="text-muted-foreground">{placeholder || 'Click để ghi phím'}</span>
      )}
      {keys.map((key, i) => (
        <span key={i}>
          <kbd className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 bg-secondary rounded text-[11px] font-mono font-medium border border-border/50 shadow-sm">
            {key}
          </kbd>
          {i < keys.length - 1 && (
            <span className="text-muted-foreground mx-0.5">+</span>
          )}
        </span>
      ))}
      {recording && value && (
        <span className="text-[10px] text-primary ml-auto">Nhấn phím khác...</span>
      )}
    </div>
  )
}
