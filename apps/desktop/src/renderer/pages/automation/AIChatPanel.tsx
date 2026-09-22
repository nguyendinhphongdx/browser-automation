import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, Loader2, Bot, User, Copy, Check, RotateCcw, X } from 'lucide-react'
import { useWorkflowStore } from '@/stores/workflow-store'
import { Drawer } from './Drawer'
import { cn } from '@/lib/utils'
import { buildNodeCatalog } from './ai-node-catalog'
import { validateAction, type AIExistingNode } from './validate-ai-workflow'
import type { WorkflowNode, WorkflowEdge, WorkflowNodeData } from '@shared/types'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  pending?: boolean
}

// Shape of a node/edge as the AI is instructed to emit them inside an action
// JSON block (see buildSystemPrompt's QUY TẮC section) — "id" on a node is a
// LOCAL/temporary id used only to wire edges within the same action.
interface AIActionNodeInput {
  id?: string
  type?: string
  nodeType?: string
  label?: string
  category?: string
  icon?: string
  config?: Record<string, unknown>
}

interface AIActionEdgeInput {
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  edgeType?: string
}

interface AIAction {
  type: 'add_nodes' | 'update_node' | 'remove_nodes' | 'replace_all'
  nodes?: AIActionNodeInput[]
  edges?: AIActionEdgeInput[]
  nodeId?: string
  label?: string
  config?: Record<string, unknown>
  nodeIds?: string[]
}

type BuiltNode = WorkflowNode
type BuiltEdge = WorkflowEdge

// Tạo system prompt mô tả workflow hiện tại cho AI
function buildSystemPrompt(workflow: any, nodeDefinitions: any[]): string {
  const nodeCatalog = buildNodeCatalog(nodeDefinitions)

  const currentNodes = (workflow?.nodes || []).map((n: any, i: number) =>
    `  ${i + 1}. [${n.id}] ${n.data.label} (${n.data.nodeType || n.type}) — config: ${JSON.stringify(n.data.config || {})}`
  ).join('\n')

  const currentEdges = (workflow?.edges || []).map((e: any) =>
    `  ${e.source} → ${e.target}${e.sourceHandle ? ` (${e.sourceHandle})` : ''}`
  ).join('\n')

  return `Bạn là AI assistant cho BrowserAuto — nền tảng tự động hoá browser.
Bạn giúp người dùng xây dựng, sửa đổi, và tối ưu workflow automation.

WORKFLOW HIỆN TẠI:
- Tên: ${workflow?.name || '(chưa có)'}
- Mode: ${workflow?.mode || 'visual'}
- Số nodes: ${workflow?.nodes?.length || 0}
- Nodes:
${currentNodes || '  (trống)'}
- Edges (kết nối):
${currentEdges || '  (không có)'}

CÁC LOẠI NODE CÓ SẴN (kèm config schema):
${nodeCatalog}

QUY TẮC:
1. Khi người dùng yêu cầu thêm/sửa/xoá nodes, trả lời bằng JSON action block:
   \`\`\`action
   { "type": "add_nodes", "nodes": [...], "edges": [...] }
   \`\`\`
   hoặc:
   \`\`\`action
   { "type": "update_node", "nodeId": "...", "config": {...} }
   \`\`\`
   hoặc:
   \`\`\`action
   { "type": "remove_nodes", "nodeIds": ["..."] }
   \`\`\`
   hoặc:
   \`\`\`action
   { "type": "replace_all", "nodes": [...], "edges": [...] }
   \`\`\`

2. Mỗi node trong "nodes" phải có format:
   { "id": "n1", "type": "automationNode", "nodeType": "<node-type>", "label": "<tên hiển thị>", "category": "<category>", "icon": "<icon-name>", "config": {...theo configSchema ở trên...} }
   Trường "id" là id TẠM để nối edge trong cùng action này (vd "n1", "n2"...) — hệ thống sẽ tự sinh id thật khi áp dụng, không cần trùng với id thật nào.

3. Mảng "edges" (nếu có), mỗi edge có format:
   { "source": "<id>", "target": "<id>", "sourceHandle": "<xem QUY TẮC RẼ NHÁNH>", "edgeType": "on-error" (tuỳ chọn) }
   "source"/"target" có thể là id tạm ("n1") của node mới trong action này, hoặc id thật của node đã có sẵn (xem mục "Nodes" ở trên, ví dụ "${'{node-id}'}").
   Nếu không khai báo "edges", hệ thống sẽ tự nối các node mới theo thứ tự tuần tự — CHỈ dùng cách này cho chuỗi bước tuần tự đơn giản, không có rẽ nhánh.
   Nếu bất kỳ node nào trong "nodes" là loại rẽ nhánh (if-else, element-exists, loop, loop-each, try-catch), BẮT BUỘC phải khai báo đủ "edges" với đúng sourceHandle theo QUY TẮC RẼ NHÁNH ở trên — nếu thiếu, hệ thống sẽ từ chối áp dụng toàn bộ action.

4. Trả lời ngắn gọn, rõ ràng, bằng tiếng Việt.
5. Giải thích ngắn gọn trước action block.
6. Nếu câu hỏi không liên quan đến workflow, trả lời bình thường không cần action block.`
}

// Parse action blocks từ response
function parseActions(content: string): any[] {
  const actions: any[] = []
  const regex = /```action\s*\n([\s\S]*?)\n```/g
  let match
  while ((match = regex.exec(content)) !== null) {
    try {
      actions.push(JSON.parse(match[1]))
    } catch {
      // Bỏ qua JSON parse error
    }
  }
  return actions
}

interface Props {
  open: boolean
  onClose: () => void
}

export function AIChatPanel({ open, onClose }: Props) {
  const { activeWorkflow, updateNodes, updateEdges, nodeDefinitions } = useWorkflowStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [open])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  // Xây dựng node/edge thật từ action.nodes/action.edges — ánh xạ id tạm
  // ("n1", "n2"...) mà AI dùng để nối edge sang id thật do canvas sinh ra.
  // Nếu action không khai báo "edges", tự nối tuần tự (chỉ phù hợp cho
  // chuỗi bước đơn giản không rẽ nhánh — đã được validateAction bắt buộc
  // khai báo "edges" cho các node rẽ nhánh).
  const buildNodesAndEdges = (
    actionNodes: AIActionNodeInput[],
    actionEdges: AIActionEdgeInput[],
    startX: number,
    startY: number,
    bridgeFrom?: string
  ): { newNodes: BuiltNode[]; newEdges: BuiltEdge[] } => {
    const idMap = new Map<string, string>()
    const newNodes: BuiltNode[] = actionNodes.map((n, i) => {
      const realId = `node-${Date.now()}-${i}`
      if (n.id) idMap.set(String(n.id), realId)
      const data: WorkflowNodeData = {
        label: n.label || '',
        category: (n.category || 'browser') as WorkflowNodeData['category'],
        icon: n.icon || 'Zap',
        nodeType: n.nodeType || n.type,
        config: n.config || {}
      }
      return {
        id: realId,
        type: 'automationNode',
        position: { x: startX + i * 250, y: startY },
        data
      }
    })

    let newEdges: BuiltEdge[]
    if (actionEdges.length > 0) {
      const resolve = (ref: string) => idMap.get(ref) ?? ref // fallback: existing canvas node id
      newEdges = actionEdges.map((e, i) => ({
        id: `e-${Date.now()}-a${i}`,
        source: resolve(String(e.source)),
        target: resolve(String(e.target)),
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        edgeType: e.edgeType as WorkflowEdge['edgeType']
      }))
    } else {
      // Tự nối tuần tự: bridge từ node hiện tại cuối cùng (nếu có) rồi nối các node mới liên tiếp
      newEdges = newNodes.slice(1).map((n, i) => ({
        id: `e-${Date.now()}-${i}`,
        source: newNodes[i].id,
        target: n.id
      }))
      if (bridgeFrom && newNodes.length > 0) {
        newEdges = [{ id: `e-${Date.now()}-bridge`, source: bridgeFrom, target: newNodes[0].id }, ...newEdges]
      }
    }

    return { newNodes, newEdges }
  }

  // Áp dụng action vào workflow — trả về lỗi validate (nếu có) thay vì
  // âm thầm ghi đè canvas với dữ liệu sai cấu trúc.
  const applyAction = (action: AIAction): string[] => {
    if (!activeWorkflow) return []

    const existingNodes = [...activeWorkflow.nodes]
    const existingEdges = [...activeWorkflow.edges]
    const existingForValidation: AIExistingNode[] = existingNodes.map((n) => ({
      id: n.id,
      nodeType: (n.data as { nodeType?: string }).nodeType || n.type
    }))

    if (action.type === 'add_nodes' || action.type === 'replace_all') {
      const { errors } = validateAction(action, nodeDefinitions, existingForValidation)
      if (errors.length > 0) return errors
    }

    if (action.type === 'add_nodes') {
      const lastNode = existingNodes[existingNodes.length - 1]
      const startX = lastNode ? lastNode.position.x + 250 : 80
      const startY = lastNode ? lastNode.position.y : 200

      const { newNodes, newEdges } = buildNodesAndEdges(
        action.nodes || [],
        action.edges || [],
        startX,
        startY,
        lastNode?.id
      )

      updateNodes([...existingNodes, ...newNodes])
      updateEdges([...existingEdges, ...newEdges])
    }

    if (action.type === 'update_node') {
      const { errors } = validateAction(action, nodeDefinitions, existingForValidation)
      if (errors.length > 0) return errors

      const updated = existingNodes.map(n => {
        if (n.id === action.nodeId) {
          return {
            ...n,
            data: {
              ...n.data,
              label: action.label || n.data.label,
              config: { ...n.data.config, ...action.config }
            }
          }
        }
        return n
      })
      updateNodes(updated)
    }

    if (action.type === 'remove_nodes') {
      const ids = new Set(action.nodeIds || [])
      updateNodes(existingNodes.filter(n => !ids.has(n.id)))
      updateEdges(existingEdges.filter(e => !ids.has(e.source) && !ids.has(e.target)))
    }

    if (action.type === 'replace_all') {
      const { newNodes, newEdges } = buildNodesAndEdges(action.nodes || [], action.edges || [], 80, 200)
      updateNodes(newNodes)
      updateEdges(newEdges)
    }

    return []
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now()
    }

    const pendingMsg: Message = {
      id: `msg-${Date.now()}-pending`,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      pending: true
    }

    setMessages(prev => [...prev, userMsg, pendingMsg])
    setInput('')
    setLoading(true)

    try {
      const systemPrompt = buildSystemPrompt(activeWorkflow, nodeDefinitions)
      const chatHistory = messages.filter(m => !m.pending).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))

      // Gọi AI qua main process (tránh CORS)
      const result = await window.api.aiChat(systemPrompt, [
        ...chatHistory,
        { role: 'user', content: text }
      ])

      if (!result.ok) {
        throw new Error(result.error || 'AI request failed')
      }

      const responseText = result.text

      // Parse actions
      const actions = parseActions(responseText)

      const assistantMsg: Message = {
        id: `msg-${Date.now()}-reply`,
        role: 'assistant',
        content: responseText,
        timestamp: Date.now()
      }

      setMessages(prev => prev.filter(m => !m.pending).concat(assistantMsg))

      // Auto-apply actions — thu lại lỗi validate thay vì âm thầm bỏ qua
      const allErrors: string[] = []
      for (const action of actions) {
        allErrors.push(...applyAction(action))
      }
      if (allErrors.length > 0) {
        const validationErrorMsg: Message = {
          id: `msg-${Date.now()}-validation`,
          role: 'assistant',
          content: `**Lỗi:** AI đã sinh ra cấu trúc workflow không hợp lệ, một số thay đổi đã bị bỏ qua:\n${allErrors.map(e => `- ${e}`).join('\n')}\n\nVui lòng thử mô tả lại rõ hơn.`,
          timestamp: Date.now()
        }
        setMessages(prev => prev.concat(validationErrorMsg))
      }
    } catch (err) {
      const errorMsg: Message = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: `**Lỗi:** ${err instanceof Error ? err.message : String(err)}`,
        timestamp: Date.now()
      }
      setMessages(prev => prev.filter(m => !m.pending).concat(errorMsg))
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const clearChat = () => {
    setMessages([])
  }

  // Render markdown-light (bold, code blocks)
  const renderContent = (content: string) => {
    // Ẩn action blocks khỏi hiển thị
    const cleaned = content.replace(/```action\s*\n[\s\S]*?\n```/g, '').trim()

    // Bold
    let html = cleaned.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-secondary rounded text-[11px] font-mono">$1</code>')
    // Line breaks
    html = html.replace(/\n/g, '<br/>')

    return <span dangerouslySetInnerHTML={{ __html: html }} />
  }

  const hasActions = (content: string) => /```action/.test(content)

  return (
    <Drawer open={open} onClose={onClose} width={400}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-500" />
          <h3 className="text-sm font-semibold">AI Assistant</h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 font-medium">Beta</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearChat}
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors"
            title="Xoá lịch sử chat"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages — flex-1 để chiếm hết space giữa header và input */}
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-purple-500" />
            </div>
            <h3 className="text-sm font-semibold mb-1">AI Workflow Assistant</h3>
            <p className="text-xs text-muted-foreground max-w-[280px] leading-relaxed">
              Mô tả workflow bạn muốn tạo, hoặc yêu cầu sửa đổi workflow hiện tại. AI sẽ tự động thêm/sửa nodes.
            </p>
            <div className="mt-4 space-y-1.5 w-full max-w-[280px]">
              {[
                'Tạo workflow đăng nhập Facebook',
                'Thêm bước chụp màn hình ở cuối',
                'Thêm delay 2 giây giữa mỗi bước',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="w-full text-left px-3 py-2 rounded-lg border border-dashed text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="h-3 w-3 text-purple-500" />
              </div>
            )}
            <div className={cn(
              'max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed',
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary/70'
            )}>
              {msg.pending ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Đang suy nghĩ...</span>
                </div>
              ) : (
                <>
                  {renderContent(msg.content)}
                  {msg.role === 'assistant' && hasActions(msg.content) && (
                    <div className="mt-2 flex items-center gap-1 text-[10px] text-purple-600 dark:text-purple-400">
                      <Sparkles className="h-3 w-3" />
                      <span>Đã áp dụng thay đổi vào workflow</span>
                    </div>
                  )}
                </>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <User className="h-3 w-3 text-primary" />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input — shrink-0 để luôn ở footer */}
      <div className="p-3 border-t shrink-0">
        <div className="flex items-end gap-2 p-2 border rounded-xl bg-background focus-within:ring-2 focus-within:ring-ring">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Mô tả những gì bạn muốn..."
            rows={1}
            className="flex-1 bg-transparent text-xs outline-none resize-none min-h-[24px] max-h-[120px] leading-relaxed"
            style={{ height: 'auto', overflowY: input.split('\n').length > 4 ? 'auto' : 'hidden' }}
            onInput={e => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = Math.min(target.scrollHeight, 120) + 'px'
            }}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="p-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          Enter để gửi · Shift+Enter xuống dòng
        </p>
      </div>
    </Drawer>
  )
}
