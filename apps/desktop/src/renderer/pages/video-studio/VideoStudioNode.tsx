import { Handle, Position } from 'reactflow'
import type { VideoNodeData, VideoNodeDefinition, VideoSocketType } from '@shared/types'
import { useVideoStudioStore, type NodeOutputPreview } from '@/stores/video-studio-store'
import {
  UserSquare, FileText, ImagePlus, Film, Crop, MessageSquare, Mic, Captions, Link,
  AudioLines, Clapperboard, Save, Zap, Loader2
} from 'lucide-react'

const ICON_MAP: Record<string, any> = {
  UserSquare, FileText, ImagePlus, Film, Crop, MessageSquare, Mic, Captions, Link,
  AudioLines, Clapperboard, Save
}

export const SOCKET_COLORS: Record<VideoSocketType, string> = {
  TEXT: '#6B7280',
  IMAGE: '#3B82F6',
  VIDEO: '#8B5CF6',
  AUDIO: '#EC4899',
  NUMBER: '#F59E0B',
  BOOLEAN: '#10B981'
}

// socket.type có thể là mảng (vd save-to-library's "media" nhận cả
// IMAGE/VIDEO/AUDIO) — chỉ cần 1 màu đại diện để vẽ handle, dùng màu của
// type đầu tiên trong danh sách.
function socketColor(type: VideoSocketType | VideoSocketType[]): string {
  return SOCKET_COLORS[Array.isArray(type) ? type[0] : type]
}

const CATEGORY_COLORS: Record<string, string> = {
  input: '#10B981',
  generate: '#8B5CF6',
  post: '#F59E0B',
  output: '#3B82F6'
}

const HANDLE_SPACING = 22
const HANDLE_START = 36

export function VideoStudioNode({ id, data, selected }: { id: string; data: VideoNodeData; selected: boolean }) {
  const nodeDefinitions = useVideoStudioStore((s) => s.nodeDefinitions)
  const preview = useVideoStudioStore((s) => s.nodePreview[id])
  const status = useVideoStudioStore((s) => s.nodeProgress[id])
  const def: VideoNodeDefinition | undefined = nodeDefinitions.find((d) => d.type === data.nodeType)
  const Icon = ICON_MAP[data.icon || ''] || Zap
  const color = CATEGORY_COLORS[def?.category || ''] || '#6B7280'

  const inputs = def?.inputs || []
  const outputs = def?.outputs || []
  const bodyHeight = Math.max(60, HANDLE_START + Math.max(inputs.length, outputs.length) * HANDLE_SPACING)

  return (
    <div
      className="relative rounded-xl border bg-card shadow-sm"
      style={{ width: 200, minHeight: bodyHeight, borderColor: selected ? 'hsl(221.2, 83.2%, 53.3%)' : color + '60' }}
    >
      {status === 'running' && (
        <div
          className="absolute -top-2 -right-2 z-10 w-5 h-5 rounded-full bg-amber-500 shadow flex items-center justify-center"
          title="Đang chạy"
        >
          <Loader2 className="h-3 w-3 text-white animate-spin" />
        </div>
      )}

      <div className="flex items-center gap-2 px-3 py-2 border-b rounded-t-xl" style={{ backgroundColor: color + '12' }}>
        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} />
        <span className="text-xs font-medium truncate">{data.label}</span>
      </div>

      {preview && <NodePreview preview={preview} />}

      <div className="relative py-2" style={{ minHeight: bodyHeight - 32 }}>
        {inputs.map((socket, i) => (
          <div
            key={socket.name}
            className="absolute left-2 flex items-center gap-1.5 text-[10px] text-muted-foreground"
            style={{ top: HANDLE_START - 24 + i * HANDLE_SPACING }}
          >
            <Handle
              type="target"
              position={Position.Left}
              id={socket.name}
              className="!w-[9px] !h-[9px] !border-[2px] !relative !left-0 !top-0 !transform-none"
              style={{ backgroundColor: socketColor(socket.type), borderColor: 'white' }}
            />
            <span>
              {socket.name}
              {!socket.required && <span className="opacity-50"> (tuỳ chọn)</span>}
            </span>
          </div>
        ))}

        {outputs.map((socket, i) => (
          <div
            key={socket.name}
            className="absolute right-2 flex items-center gap-1.5 text-[10px] text-muted-foreground"
            style={{ top: HANDLE_START - 24 + i * HANDLE_SPACING }}
          >
            <span>{socket.name}</span>
            <Handle
              type="source"
              position={Position.Right}
              id={socket.name}
              className="!w-[9px] !h-[9px] !border-[2px] !relative !right-0 !top-0 !transform-none"
              style={{ backgroundColor: socketColor(socket.type), borderColor: 'white' }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Kết quả thật của lần chạy gần nhất, hiện ngay trên node — kiểu ComfyUI. */
function NodePreview({ preview }: { preview: NodeOutputPreview }) {
  switch (preview.kind) {
    case 'image':
      return (
        <div className="border-b bg-black/5">
          <img src={preview.dataUrl} alt="" className="w-full h-24 object-cover" />
        </div>
      )
    case 'video':
      return (
        <div className="border-b bg-black/5">
          <video src={preview.dataUrl} controls muted className="w-full h-24 object-cover" />
        </div>
      )
    case 'audio':
      return (
        <div className="border-b bg-muted/30 px-2 py-1.5">
          <audio src={preview.dataUrl} controls className="w-full h-7" />
        </div>
      )
    case 'text':
      return (
        <div className="border-b bg-muted/30 px-2.5 py-1.5 text-[10px] leading-relaxed text-muted-foreground line-clamp-3">
          {preview.text}
        </div>
      )
    case 'value':
      return (
        <div className="border-b bg-muted/30 px-2.5 py-1 text-[10px] font-mono text-muted-foreground">
          {preview.text}
        </div>
      )
    default:
      return null
  }
}

export { ICON_MAP as VIDEO_NODE_ICON_MAP }
