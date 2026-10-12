import { useCallback, useEffect, useState } from 'react'
import { Sparkles, RotateCcw, X, Shield, ShieldOff, Library } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Drawer } from '@/components/Drawer'
import { Conversation } from '@/components/ai-elements/Conversation'
import { Message } from '@/components/ai-elements/Message'
import { ReasoningBlock } from '@/components/ai-elements/ReasoningBlock'
import { ToolCallCard } from '@/components/ai-elements/ToolCallCard'
import { ApprovalCard } from '@/components/ai-elements/ApprovalCard'
import { PromptInput } from '@/components/ai-elements/PromptInput'
import { BrowserPreview } from '@/components/ai-elements/BrowserPreview'
import { AttachmentChip } from '@/components/ai-elements/AttachmentChip'
import { ResourcePicker } from '@/components/library/ResourcePicker'
import { useAgentRun, type AgentDomain, type AgentRunContext } from './use-agent-run'
import { useBrowserPreview } from './use-browser-preview'
import type { LibraryResource } from '@shared/types'

interface Props {
  domain: AgentDomain
  open: boolean
  onClose: () => void
  buildRunContext: () => AgentRunContext
  // Pattern-match toolName here to react to a successful tool call — apply a
  // workflow/pipeline patch, refetch a store, reconnect the browser preview
  // (via the `browserPreview` object this component exposes no further —
  // automation's page does this itself through its own hook instance it
  // doesn't need; see AutomationPage.tsx). See use-agent-run.ts for why this
  // replaced the old per-domain onWorkflowPatch/onPipelinePatch callbacks.
  onToolResult?: (toolName: string, resultText: string, ok: boolean) => void
  // Only 'automation' passes a real profileId — mounts the live browser
  // preview. Other domains leave this undefined and the preview UI is
  // skipped entirely (useBrowserPreview already no-ops on undefined).
  profileId?: string
  // Domain-specific validation error to show inline (e.g. "AI's proposed
  // workflow patch failed re-validation against the live canvas") — a
  // concern this component can't own since what counts as "a patch" differs
  // per domain; the page sets/clears it from its own onToolResult handler.
  extraError?: string | null
  title: string
  description: string
  suggestions: string[]
  placeholder: string
  // Tin nhắn tự động GỬI NGAY khi panel đang mở — dùng cho các lối tắt kiểu
  // "Nhờ AI làm" từ nơi khác (vd TaskDetailDrawer) muốn vừa mở panel vừa gửi
  // luôn, không bắt người dùng gõ lại. Chỉ gửi đúng 1 lần — bên gọi PHẢI tự
  // xoá nó (set về null) trong onInitialMessageSent, nếu không lần mở panel
  // sau sẽ gửi lại đúng tin nhắn cũ.
  initialMessage?: string | null
  onInitialMessageSent?: () => void
}

/**
 * Shared AI chat panel (ADR-0005) — 1 component for every domain, replacing
 * the old per-module AgentChatPanel/VideoAgentChatPanel duplication. Always
 * supports approval cards + resource attachment, since any domain's toolset
 * can include an approval-gated tool (e.g. delete_resource is gated in
 * automation, video-studio, AND project — see domains.ts) — making this
 * optional-per-domain was exactly the bug ADR-0005 found and fixed (a run
 * could hang forever waiting on an approval the UI had no way to show).
 */
export function AgentChatPanel({
  domain,
  open,
  onClose,
  buildRunContext,
  onToolResult,
  profileId,
  extraError,
  title,
  description,
  suggestions,
  placeholder,
  initialMessage,
  onInitialMessageSent
}: Props) {
  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState<LibraryResource[]>([])
  const [showResourcePicker, setShowResourcePicker] = useState(false)
  const bypassStorageKey = `agent-bypass-approvals:${domain}`
  const [bypassApprovals, setBypassApprovals] = useState(() => {
    try {
      return localStorage.getItem(bypassStorageKey) === 'true'
    } catch {
      return false
    }
  })
  const browserPreview = useBrowserPreview(open ? profileId : undefined)

  const handleToolResult = useCallback(
    (toolName: string, resultText: string, ok: boolean) => {
      if (ok && toolName === 'start_browser') browserPreview.reconnect()
      if (ok && toolName === 'close_browser') browserPreview.disconnect()
      onToolResult?.(toolName, resultText, ok)
    },
    [browserPreview.reconnect, browserPreview.disconnect, onToolResult]
  )

  const { items, loading, error, send, respondApproval, cancel, reset } = useAgentRun({
    domain,
    buildRunContext,
    onToolResult: handleToolResult
  })

  // "Nhờ AI làm" shortcut — gửi NGAY khi mở, không chờ người dùng gõ/bấm gì
  // thêm (đã hỏi và chốt với người dùng). Guard theo initialMessage còn giá
  // trị, không theo `open` một mình, để effect chỉ bắn đúng 1 lần cho mỗi
  // tin nhắn (bên gọi set về null trong onInitialMessageSent ngay sau đó).
  useEffect(() => {
    if (open && initialMessage) {
      send(initialMessage)
      onInitialMessageSent?.()
    }
  }, [open, initialMessage, send, onInitialMessageSent])

  useEffect(() => {
    try {
      localStorage.setItem(bypassStorageKey, String(bypassApprovals))
    } catch {
      // Private window / blocked storage — bypass just won't persist across reopens.
    }
  }, [bypassApprovals, bypassStorageKey])

  // Auto-respond to every pending approval the instant it shows up while
  // bypass is on — respondApproval flips the item's status away from
  // 'pending' synchronously, so each one only ever fires once.
  useEffect(() => {
    if (!bypassApprovals) return
    for (const item of items) {
      if (item.kind === 'approval' && item.status === 'pending') {
        respondApproval(item.approvalId, true)
      }
    }
  }, [items, bypassApprovals, respondApproval])

  // Tag thật gửi cho model vẫn là "[resource:id "name"]" (mọi
  // PROJECT/VIDEO/AGENT_INSTRUCTIONS đều dạy model nhận ra cú pháp này),
  // chỉ khác là người dùng không còn phải nhìn/sửa chung với văn bản họ gõ
  // trong lúc soạn — mỗi attachment hiện thành badge riêng, ghép vào cuối
  // tin nhắn CHỈ lúc gửi.
  const handleSend = () => {
    const text = attachments.length
      ? `${input}\n${attachments.map((r) => `[resource:${r.id} "${r.name}"]`).join('\n')}`.trim()
      : input
    setInput('')
    setAttachments([])
    send(text)
  }

  // Prompt-template -> insert its actual text (ready to send as-is). Mọi
  // loại khác -> thêm vào danh sách attachment (hiện badge), không đụng vào
  // text người dùng đang gõ.
  const handlePickResource = async (resource: LibraryResource) => {
    if (resource.kind === 'prompt-template') {
      const text = (await window.api.getLibraryResourceText(resource.id)) ?? ''
      setInput((prev) => (prev ? `${prev}\n${text}` : text))
      return
    }
    setAttachments((prev) => (prev.some((r) => r.id === resource.id) ? prev : [...prev, resource]))
  }

  return (
    <Drawer open={open} onClose={onClose} width={400}>
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-500" />
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={reset}
            className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent"
            title="Xoá lịch sử chat"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Live browser preview — automation only (profileId undefined elsewhere) */}
      {profileId !== undefined && (
        <BrowserPreview status={browserPreview.status} frame={browserPreview.frame} message={browserPreview.message} />
      )}

      {/* Conversation */}
      <Conversation>
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30">
              <Sparkles className="h-6 w-6 text-purple-500" />
            </div>
            <h3 className="mb-1 text-sm font-semibold">{title}</h3>
            <p className="max-w-[280px] text-xs leading-relaxed text-muted-foreground">{description}</p>
            <div className="mt-4 w-full max-w-[280px] space-y-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="w-full cursor-pointer rounded-lg border border-dashed px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {items.map((item) => {
          switch (item.kind) {
            case 'user-message':
              return (
                <Message key={item.id} role="user">
                  {item.text}
                </Message>
              )
            case 'text':
              return (
                <Message key={item.id} role="assistant" streaming={item.streaming}>
                  {item.text}
                </Message>
              )
            case 'reasoning':
              return <ReasoningBlock key={item.id} text={item.text} streaming={item.streaming} />
            case 'tool':
              return (
                <ToolCallCard
                  key={item.id}
                  toolName={item.toolName}
                  status={item.status}
                  argsText={item.argsText}
                  resultText={item.resultText}
                />
              )
            case 'approval':
              return (
                <ApprovalCard
                  key={item.id}
                  toolName={item.toolName}
                  input={item.input}
                  reason={item.reason}
                  status={item.status}
                  onRespond={(approved) => respondApproval(item.approvalId, approved)}
                />
              )
            case 'screenshot':
              return (
                <div key={item.id} className="max-w-[85%] overflow-hidden rounded-lg border">
                  <img src={item.dataUrl} alt="Ảnh chụp màn hình trang" className="w-full" />
                </div>
              )
            case 'resource-preview':
              return (
                <div key={item.id} className="max-w-[85%] overflow-hidden rounded-lg border">
                  <img src={item.dataUrl} alt={item.name} className="w-full" />
                  <p className="px-2 py-1 text-[11px] text-muted-foreground border-t bg-muted/30">{item.name}</p>
                </div>
              )
            default:
              return null
          }
        })}

        {error && (
          <div className="max-w-[85%] rounded-xl bg-destructive/10 px-3 py-2 text-xs leading-relaxed text-destructive">
            <strong>Lỗi:</strong> {error}
          </div>
        )}
        {extraError && (
          <div className="max-w-[85%] rounded-xl bg-destructive/10 px-3 py-2 text-xs leading-relaxed text-destructive">
            {extraError}
          </div>
        )}
      </Conversation>

      {/* Input */}
      <div className="shrink-0 border-t p-3">
        <div className="mb-2 flex items-center gap-1.5">
          <button
            onClick={() => setShowResourcePicker(true)}
            className="shrink-0 cursor-pointer rounded-lg border px-2 py-1.5 text-muted-foreground transition-colors hover:bg-accent"
            title="Chèn prompt mẫu hoặc tham chiếu 1 tài nguyên từ Thư viện"
          >
            <Library className="h-3 w-3" />
          </button>
          <button
            onClick={() => setBypassApprovals((v) => !v)}
            className={cn(
              'flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-colors',
              bypassApprovals
                ? 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                : 'border-dashed text-muted-foreground hover:bg-accent'
            )}
            title="Khi bật, AI sẽ tự động duyệt mọi hành động cần xác nhận (xoá resource, chạy JS...) mà không hỏi lại bạn — chỉ bật khi bạn tin tưởng hoàn toàn yêu cầu đang đưa ra."
          >
            {bypassApprovals ? <ShieldOff className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
            {bypassApprovals ? 'Đang tự động duyệt mọi hành động' : 'Tự động duyệt (bỏ qua xác nhận)'}
          </button>
        </div>
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {attachments.map((r) => (
              <AttachmentChip key={r.id} resource={r} onRemove={() => setAttachments((prev) => prev.filter((a) => a.id !== r.id))} />
            ))}
          </div>
        )}
        <PromptInput
          value={input}
          onChange={setInput}
          onSubmit={handleSend}
          onStop={cancel}
          loading={loading}
          placeholder={placeholder}
        />
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
          Enter để gửi · Shift+Enter xuống dòng
        </p>
      </div>

      <ResourcePicker
        open={showResourcePicker}
        onClose={() => setShowResourcePicker(false)}
        onSelect={handlePickResource}
      />
    </Drawer>
  )
}
