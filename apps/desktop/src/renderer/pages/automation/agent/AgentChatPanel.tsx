import { useCallback, useState } from 'react'
import { Sparkles, RotateCcw, X } from 'lucide-react'
import { useWorkflowStore } from '@/stores/workflow-store'
import { Drawer } from '../Drawer'
import { Conversation } from '@/components/ai-elements/Conversation'
import { Message } from '@/components/ai-elements/Message'
import { ReasoningBlock } from '@/components/ai-elements/ReasoningBlock'
import { ToolCallCard } from '@/components/ai-elements/ToolCallCard'
import { ApprovalCard } from '@/components/ai-elements/ApprovalCard'
import { PromptInput } from '@/components/ai-elements/PromptInput'
import { BrowserPreview } from '@/components/ai-elements/BrowserPreview'
import { useAgentRun } from './use-agent-run'
import { useBrowserPreview } from './use-browser-preview'
import { applyWorkflowPatch, type WorkflowChangePatch } from './apply-workflow-patch'

interface Props {
  open: boolean
  onClose: () => void
  profileId: string
}

const SUGGESTIONS = [
  'Trang này đang hiển thị gì, có nút đăng nhập không?',
  'Chụp màn hình trang hiện tại cho tôi xem',
  'Kiểm tra xem phần tử .login-button có tồn tại không'
]

export function AgentChatPanel({ open, onClose, profileId }: Props) {
  const { activeWorkflow, nodeDefinitions, updateNodes, updateEdges } = useWorkflowStore()
  const [input, setInput] = useState('')
  const [patchError, setPatchError] = useState<string | null>(null)
  const browserPreview = useBrowserPreview(open ? profileId : undefined)

  // Re-validates against the LIVE canvas (not the stale snapshot the run
  // started with) right before actually mutating it — the authoritative
  // second gate of the two-gate validation design (main process's tool
  // already did the fast first check against a start-of-run snapshot).
  const handleWorkflowPatch = useCallback(
    (patch: WorkflowChangePatch) => {
      const current = useWorkflowStore.getState().activeWorkflow
      if (!current) return
      const result = applyWorkflowPatch(patch, nodeDefinitions, { nodes: current.nodes, edges: current.edges })
      if (!result.ok) {
        setPatchError(result.errors?.join('; ') ?? 'Không thể áp dụng thay đổi do AI đề xuất')
        return
      }
      setPatchError(null)
      updateNodes(result.nodes!)
      updateEdges(result.edges!)
    },
    [nodeDefinitions, updateNodes, updateEdges]
  )

  const { items, loading, error, send, respondApproval, cancel, reset } = useAgentRun({
    profileId,
    workflowId: activeWorkflow?.id,
    getWorkflowSnapshot: () => ({
      nodes: activeWorkflow?.nodes ?? [],
      edges: activeWorkflow?.edges ?? []
    }),
    onWorkflowPatch: handleWorkflowPatch
  })

  const handleSend = () => {
    const text = input
    setInput('')
    send(text)
  }

  return (
    <Drawer open={open} onClose={onClose} width={400}>
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-500" />
          <h3 className="text-sm font-semibold">AI Agent</h3>
          <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
            Beta
          </span>
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

      {/* Live browser preview */}
      <BrowserPreview status={browserPreview.status} frame={browserPreview.frame} message={browserPreview.message} />

      {/* Conversation */}
      <Conversation>
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30">
              <Sparkles className="h-6 w-6 text-purple-500" />
            </div>
            <h3 className="mb-1 text-sm font-semibold">AI Agent</h3>
            <p className="max-w-[280px] text-xs leading-relaxed text-muted-foreground">
              Có thể đọc DOM/URL trang đang mở, chạy JS để kiểm tra (cần bạn duyệt), chụp màn hình, và đề xuất
              thay đổi workflow đã validate.
            </p>
            <div className="mt-4 w-full max-w-[280px] space-y-1.5">
              {SUGGESTIONS.map((s) => (
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
            default:
              return null
          }
        })}

        {error && (
          <div className="max-w-[85%] rounded-xl bg-destructive/10 px-3 py-2 text-xs leading-relaxed text-destructive">
            <strong>Lỗi:</strong> {error}
          </div>
        )}
        {patchError && (
          <div className="max-w-[85%] rounded-xl bg-destructive/10 px-3 py-2 text-xs leading-relaxed text-destructive">
            <strong>Không áp dụng được thay đổi AI đề xuất:</strong> {patchError}
          </div>
        )}
      </Conversation>

      {/* Input */}
      <div className="shrink-0 border-t p-3">
        <PromptInput
          value={input}
          onChange={setInput}
          onSubmit={handleSend}
          onStop={cancel}
          loading={loading}
          placeholder="Hỏi hoặc yêu cầu agent kiểm tra trang, đề xuất workflow..."
        />
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
          Enter để gửi · Shift+Enter xuống dòng
        </p>
      </div>
    </Drawer>
  )
}
