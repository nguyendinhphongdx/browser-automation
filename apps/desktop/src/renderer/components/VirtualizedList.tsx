import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

interface Props<T> {
  items: T[]
  estimateSize: number
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
}

export function VirtualizedList<T>({ items, estimateSize, renderItem, className }: Props<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 10,
  })

  return (
    <div ref={parentRef} className={className} style={{ overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  )
}
