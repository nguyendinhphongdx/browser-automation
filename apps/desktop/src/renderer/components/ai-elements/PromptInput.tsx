import { Send, Loader2, Square } from 'lucide-react'

interface PromptInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onStop?: () => void
  loading?: boolean
  placeholder?: string
}

export function PromptInput({ value, onChange, onSubmit, onStop, loading, placeholder }: PromptInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!loading) onSubmit()
    }
  }

  return (
    <div className="flex items-end gap-2 rounded-xl border bg-background p-2 focus-within:ring-2 focus-within:ring-ring">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        className="min-h-[24px] max-h-[120px] flex-1 resize-none bg-transparent text-xs leading-relaxed outline-none"
        style={{ height: 'auto', overflowY: value.split('\n').length > 4 ? 'auto' : 'hidden' }}
        onInput={(e) => {
          const target = e.target as HTMLTextAreaElement
          target.style.height = 'auto'
          target.style.height = Math.min(target.scrollHeight, 120) + 'px'
        }}
      />
      {loading && onStop ? (
        <button
          onClick={onStop}
          className="shrink-0 cursor-pointer rounded-lg bg-destructive/10 p-2 text-destructive transition-colors hover:bg-destructive/20"
          title="Dừng"
        >
          <Square className="h-3.5 w-3.5" />
        </button>
      ) : (
        <button
          onClick={onSubmit}
          disabled={loading || !value.trim()}
          className="shrink-0 cursor-pointer rounded-lg bg-primary p-2 text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  )
}
