import { FolderOpen, FileText, Database, File as FileIcon, Music } from 'lucide-react'
import type { LibraryResource } from '@shared/types'

interface Props {
  resource: LibraryResource
  onOpenFolder: (resource: LibraryResource) => void
  onSelect: (resource: LibraryResource) => void
  selected?: boolean
}

export function LibraryGridCard({ resource, onOpenFolder, onSelect, selected }: Props) {
  const handleClick = () => {
    if (resource.kind === 'folder') onOpenFolder(resource)
    else onSelect(resource)
  }

  return (
    <button
      onClick={handleClick}
      className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-colors hover:bg-accent ${
        selected ? 'border-primary bg-primary/5' : ''
      }`}
    >
      <div className="flex h-20 w-full items-center justify-center overflow-hidden rounded-lg bg-muted/50">
        {resource.kind === 'image' ? (
          <img
            src={`app-resource://${resource.id}`}
            alt={resource.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : resource.kind === 'video' ? (
          <video
            src={`app-resource://${resource.id}`}
            preload="metadata"
            muted
            playsInline
            className="h-full w-full object-cover"
          />
        ) : resource.kind === 'audio' ? (
          <Music className="h-8 w-8 text-pink-500" />
        ) : resource.kind === 'folder' ? (
          <FolderOpen className="h-8 w-8 text-amber-500" />
        ) : resource.kind === 'prompt-template' ? (
          <FileText className="h-8 w-8 text-purple-500" />
        ) : resource.kind === 'data-export' ? (
          <Database className="h-8 w-8 text-emerald-500" />
        ) : (
          <FileIcon className="h-8 w-8 text-muted-foreground" />
        )}
      </div>
      <span className="w-full truncate text-xs font-medium" title={resource.name}>
        {resource.name}
      </span>
    </button>
  )
}
