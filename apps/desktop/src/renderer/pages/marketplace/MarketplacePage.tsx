import { ShoppingBag } from 'lucide-react'

export function MarketplacePage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
      <ShoppingBag className="h-16 w-16 mb-4 opacity-30" />
      <h2 className="text-xl font-semibold text-foreground">Marketplace</h2>
      <p className="text-sm mt-2">Chia sẻ và mua bán kịch bản automation</p>
      <p className="text-xs mt-1">Sẽ có trong Phase 4</p>
    </div>
  )
}
