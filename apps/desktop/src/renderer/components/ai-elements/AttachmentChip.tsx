import { X, Image as ImageIcon, Film, Music, FileText, Database, File as FileIcon } from 'lucide-react'
import type { LibraryResource } from '@shared/types'

const ICON_BY_KIND: Record<string, typeof FileIcon> = {
  image: ImageIcon,
  video: Film,
  audio: Music,
  'prompt-template': FileText,
  'data-export': Database
}

/**
 * Badge hiện khi đính kèm 1 resource vào tin nhắn — thay cho cách cũ nhét
 * thẳng text `[resource:id "name"]` vào ô nhập (người dùng phải đọc/sửa
 * chung với văn bản họ gõ, trông như lỗi copy-paste). Chip này chỉ là UI lúc
 * soạn tin — nội dung `[resource:...]` thật vẫn được ghép vào tin nhắn GỬI
 * ĐI (xem AgentChatPanel.tsx's handleSend), model vẫn thấy đúng tham chiếu
 * đó như trước.
 */
export function AttachmentChip({ resource, onRemove }: { resource: LibraryResource; onRemove: () => void }) {
  const Icon = ICON_BY_KIND[resource.kind] || FileIcon
  return (
    <div className="inline-flex max-w-[180px] items-center gap-1.5 rounded-full border bg-secondary/50 py-1 pl-2 pr-1 text-[11px]">
      <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />
      <span className="truncate" title={resource.name}>
        {resource.name}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 cursor-pointer rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        title="Bỏ đính kèm"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}
