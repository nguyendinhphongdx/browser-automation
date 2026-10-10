import { useState } from 'react'
import { Sparkles, RotateCcw, X } from 'lucide-react'
import { Conversation } from '@/components/ai-elements/Conversation'
import { Message } from '@/components/ai-elements/Message'
import { ReasoningBlock } from '@/components/ai-elements/ReasoningBlock'
import { ToolCallCard } from '@/components/ai-elements/ToolCallCard'
import { PromptInput } from '@/components/ai-elements/PromptInput'
import { useVideoStudioStore } from '@/stores/video-studio-store'
import { useVideoAgentRun } from './useVideoAgentRun'
import { applyVideoPipelinePatch, type VideoPipelineChangePatch } from './apply-video-pipeline-patch'

interface Props {
  open: boolean
  onClose: () => void
}

const SUGGESTIONS = [
  'Mèo phiêu lưu trong thành phố neon, 3 cảnh, phong cách cinematic, có giọng kể',
  'Hướng dẫn pha cà phê, 2 cảnh, có lời thoại nhân vật',
  'Quảng cáo sản phẩm 15 giây, 1 cảnh, không lời thoại'
]

/** Mirror AgentChatPanel.tsx, rút gọn cho Video Studio — xem useVideoAgentRun.ts về lý do bỏ phần duyệt tool. */
export function VideoAgentChatPanel({ open, onClose }: Props) {
  const { activePipeline, nodeDefinitions, updateNodes, updateEdges } = useVideoStudioStore()
  const [input, setInput] = useState('')
  const [patchError, setPatchError] = useState<string | null>(null)

  const handlePipelinePatch = (patch: VideoPipelineChangePatch) => {
    const current = useVideoStudioStore.getState().activePipeline
    if (!current) return
    const result = applyVideoPipelinePatch(patch, nodeDefinitions, { nodes: current.nodes, edges: current.edges })
    if (!result.ok) {
      setPatchError(result.errors?.join('; ') ?? 'Không thể áp dụng pipeline do AI đề xuất')
      return
    }
    setPatchError(null)
    updateNodes(result.nodes!)
    updateEdges(result.edges!)
  }

  const { items, loading, error, send, cancel, reset } = useVideoAgentRun({
    pipelineId: activePipeline?.id,
    getPipelineSnapshot: () => ({ nodes: activePipeline?.nodes ?? [], edges: activePipeline?.edges ?? [] }),
    onPipelinePatch: handlePipelinePatch
  })

  if (!open) return null

  const handleSend = () => {
    const text = input
    setInput('')
    send(text)
  }

  return (
    <div className="absolute top-0 right-0 z-40 h-full w-96 border-l bg-card shadow-2xl flex flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-500" />
          <h3 className="text-sm font-semibold">AI dựng pipeline</h3>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={reset} className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent" title="Xoá lịch sử chat">
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button onClick={onClose} className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Conversation>
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30">
              <Sparkles className="h-6 w-6 text-purple-500" />
            </div>
            <h3 className="mb-1 text-sm font-semibold">Dựng pipeline bằng 1 câu</h3>
            <p className="max-w-[280px] text-xs leading-relaxed text-muted-foreground">
              Mô tả ý tưởng video — AI sẽ tự dựng nhân vật, các cảnh, TTS, ghép nối lên canvas để bạn xem/sửa trước khi chạy.
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
              return <Message key={item.id} role="user">{item.text}</Message>
            case 'text':
              return <Message key={item.id} role="assistant" streaming={item.streaming}>{item.text}</Message>
            case 'reasoning':
              return <ReasoningBlock key={item.id} text={item.text} streaming={item.streaming} />
            case 'tool':
              return <ToolCallCard key={item.id} toolName={item.toolName} status={item.status} argsText={item.argsText} resultText={item.resultText} />
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
        {patchError && (
          <div className="max-w-[85%] rounded-xl bg-destructive/10 px-3 py-2 text-xs leading-relaxed text-destructive">
            <strong>Không áp dụng được pipeline AI đề xuất:</strong> {patchError}
          </div>
        )}
      </Conversation>

      <div className="shrink-0 border-t p-3">
        <PromptInput
          value={input}
          onChange={setInput}
          onSubmit={handleSend}
          onStop={cancel}
          loading={loading}
          placeholder="Mô tả ý tưởng video muốn tạo..."
        />
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground">Enter để gửi · Shift+Enter xuống dòng</p>
      </div>
    </div>
  )
}
