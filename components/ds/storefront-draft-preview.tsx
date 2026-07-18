'use client'

import Image from 'next/image'
import { ImagePlus, LoaderCircle, PackageOpen, Sparkles } from 'lucide-react'

import type { ProductDraft } from '@/components/ds/extracted-product-row'
import { Price } from '@/components/ds/price'
import { StockBadge } from '@/components/ds/stock-badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function StorefrontDraftPreview({
  sellerName,
  dropSlug,
  products,
  busyProductIds,
  errors,
  onImprove,
  onUpload,
}: {
  sellerName: string
  dropSlug: string
  products: ProductDraft[]
  busyProductIds: string[]
  errors: Record<string, string>
  onImprove: (product: ProductDraft) => void
  onUpload: (product: ProductDraft, file: File) => void
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-muted/40 shadow-sm">
      <div className="border-b border-border bg-card px-4 py-4">
        <p className="text-sm font-semibold">{sellerName || 'Your store'}</p>
        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
          /{dropSlug || 'tonight'} · storefront preview
        </p>
      </div>

      <div className="space-y-3 p-3">
        {products.map((product) => {
          const busy = busyProductIds.includes(product.id)
          const price = Number(product.price)
          const stock = Number(product.stock)

          return (
            <article
              key={product.id}
              className="overflow-hidden rounded-xl border border-border bg-card"
            >
              <div className="relative aspect-square w-full overflow-hidden bg-muted sm:aspect-[4/3]">
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={`${product.name || 'Product'} storefront shot`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 448px) 100vw, 448px"
                  />
                ) : (
                  <div className="flex size-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                    <span className="flex size-12 items-center justify-center rounded-full bg-background">
                      <PackageOpen className="size-5" />
                    </span>
                    <p className="max-w-56 text-xs leading-relaxed">
                      Add a photo or let AI create a clean product shot.
                    </p>
                  </div>
                )}

                {product.imageSource && (
                  <span className="absolute top-3 left-3 rounded-full bg-background/90 px-2.5 py-1 font-mono text-[10px] tracking-wider text-foreground uppercase shadow-sm backdrop-blur-sm">
                    {product.imageSource === 'generated' ? 'AI improved' : 'Original'}
                  </span>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold">{product.name || 'Untitled product'}</p>
                    {product.variant && (
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {product.variant}
                      </p>
                    )}
                    {Number.isFinite(price) && price > 0 && (
                      <Price amount={price} className="mt-1.5 block" />
                    )}
                  </div>
                  {Number.isInteger(stock) && stock > 0 && (
                    <StockBadge remaining={stock} />
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <label
                    className={cn(
                      buttonVariants({ variant: 'outline' }),
                      'cursor-pointer',
                      busy && 'pointer-events-none opacity-50',
                    )}
                  >
                    <ImagePlus />
                    {product.imageUrl ? 'Replace' : 'Add photo'}
                    <input
                      className="sr-only"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={busy}
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) onUpload(product, file)
                        event.currentTarget.value = ''
                      }}
                    />
                  </label>
                  <Button
                    type="button"
                    variant={product.imageUrl ? 'default' : 'secondary'}
                    disabled={busy || !product.name.trim()}
                    onClick={() => onImprove(product)}
                  >
                    {busy ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      <Sparkles />
                    )}
                    {busy ? 'Working…' : 'Improve shot'}
                  </Button>
                </div>

                {errors[product.id] && (
                  <p className="mt-3 text-xs leading-relaxed text-destructive" role="alert">
                    {errors[product.id]}
                  </p>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
