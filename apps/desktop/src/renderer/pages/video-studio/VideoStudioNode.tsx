import { Handle, Position } from 'reactflow'
import type { VideoNodeData, VideoNodeDefinition, VideoSocketType } from '@shared/types'
import { useVideoStudioStore } from '@/stores/video-studio-store'
import {
  UserSquare, FileText, ImagePlus, Film, Crop, MessageSquare, Mic, Captions, Link,
  AudioLines, Clapperboard, Save, Zap
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

const CATEGORY_COLORS: Record<string, string> = {
  input: '#10B981',
  generate: '#8B5CF6',
  post: '#F59E0B',
  output: '#3B82F6'
}

const HANDLE_SPACING = 22
const HANDLE_START = 36

export function VideoStudioNode({ data, selected }: { data: VideoNodeData; selected: boolean }) {
  const nodeDefinitions = useVideoStudioStore((s) => s.nodeDefinitions)
  const def: VideoNodeDefinition | undefined = nodeDefinitions.find((d) => d.type === data.nodeType)
  const Icon = ICON_MAP[data.icon || ''] || Zap
  const color = CATEGORY_COLORS[def?.category || ''] || '#6B7280'

  const inputs = def?.inputs || []
  const outputs = def?.outputs || []
  const bodyHeight = Math.max(60, HANDLE_START + Math.max(inputs.length, outputs.length) * HANDLE_SPACING)

  return (
    <div
      className="rounded-xl border bg-card shadow-sm"
      style={{ width: 200, minHeight: bodyHeight, borderColor: selected ? 'hsl(221.2, 83.2%, 53.3%)' : color + '60' }}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b rounded-t-xl" style={{ backgroundColor: color + '12' }}>
        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} />
        <span className="text-xs font-medium truncate">{data.label}</span>
      </div>

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
              style={{ backgroundColor: SOCKET_COLORS[socket.type], borderColor: 'white' }}
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
              style={{ backgroundColor: SOCKET_COLORS[socket.type], borderColor: 'white' }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export { ICON_MAP as VIDEO_NODE_ICON_MAP }
