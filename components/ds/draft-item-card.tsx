'use client'

import Image from 'next/image'
import { ImagePlus, LoaderCircle, Sparkles, Trash2 } from 'lucide-react'

import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export type ProductDraft = {
  id: string
  name: string
  variant: string
  price: string
  stock: string
  imageUrl: string | null
  imageSource: 'source' | 'uploaded' | 'generated' | null
}

/**
 * One item in the draft: the photo a buyer will see, with its details editable
 * in place. Editor and preview are the same card — the seller never checks the
 * same item twice.
 */
export function DraftItemCard({
  product,
  canRemove,
  busy,
  error,
  onChange,
  onRemove,
  onUpload,
  onImprove,
}: {
  product: ProductDraft
  canRemove: boolean
  busy: boolean
  error?: string
  onChange: (product: ProductDraft) => void
  onRemove: () => void
  onUpload: (product: ProductDraft, file: File) => void
  onImprove: (product: ProductDraft) => void
}) {
  const fieldId = (field: string) => `${field}-${product.id}`
  const itemLabel = product.name.trim() || 'this item'

  return (
    <article className="animate-rise overflow-hidden rounded-2xl border border-border bg-card">
      {/* The photo only earns full height once it exists; an empty slot stays a
          thin prompt so the seller can keep scrolling. */}
      <div
        className={cn(
          'relative w-full overflow-hidden bg-muted',
          product.imageUrl ? 'aspect-[4/3]' : 'h-20',
        )}
      >
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={`${product.name || 'Item'} photo`}
            fill
            className="object-cover"
            sizes="(max-width: 448px) 100vw, 448px"
          />
        ) : (
          <div className="flex size-full items-center justify-center gap-2 text-muted-foreground">
            <ImagePlus className="size-4" />
            <p className="text-xs">No photo yet</p>
          </div>
        )}

        {product.imageSource === 'generated' && (
          <span className="absolute top-3 left-3 rounded-full bg-background/90 px-2.5 py-1 font-mono text-[10px] tracking-wider uppercase shadow-sm backdrop-blur-sm">
            AI photo
          </span>
        )}

        {product.imageSource === 'source' && (
          <span className="absolute top-3 left-3 rounded-full bg-background/90 px-2.5 py-1 font-mono text-[10px] tracking-wider uppercase shadow-sm backdrop-blur-sm">
            Source photo
          </span>
        )}

        <Button
          type="button"
          size="icon-sm"
          variant="secondary"
          className="absolute top-2 right-2 rounded-full bg-background/90 shadow-sm backdrop-blur-sm"
          aria-label={`Remove ${itemLabel}`}
          disabled={!canRemove || busy}
          onClick={onRemove}
        >
          <Trash2 />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 border-b border-border p-3">
        <label
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
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
          size="sm"
          variant="secondary"
          disabled={busy || !product.name.trim()}
          title={
            product.name.trim()
              ? undefined
              : 'Name the item first so AI knows what to shoot'
          }
          onClick={() => onImprove(product)}
        >
          {busy ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
          {busy ? 'Working…' : 'AI photo'}
        </Button>
      </div>

      {error && (
        <p
          className="border-b border-border px-3 pb-3 text-xs leading-relaxed text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="space-y-3 p-4">
        <div className="space-y-1.5">
          <Label htmlFor={fieldId('name')}>Item</Label>
          <Input
            id={fieldId('name')}
            value={product.name}
            maxLength={120}
            placeholder="e.g. Set A"
            required
            onChange={(event) =>
              onChange({ ...product, name: event.target.value })
            }
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={fieldId('variant')}>
            Detail <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id={fieldId('variant')}
            value={product.variant}
            maxLength={120}
            placeholder="e.g. 6 pieces"
            onChange={(event) =>
              onChange({ ...product, variant: event.target.value })
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor={fieldId('price')}>Price (S$)</Label>
            <Input
              id={fieldId('price')}
              className="font-mono tabular-nums"
              type="number"
              inputMode="decimal"
              min="0.01"
              max="100000"
              step="0.01"
              value={product.price}
              required
              onChange={(event) =>
                onChange({ ...product, price: event.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={fieldId('stock')}>How many</Label>
            <Input
              id={fieldId('stock')}
              className="font-mono tabular-nums"
              type="number"
              inputMode="numeric"
              min="1"
              max="100000"
              step="1"
              value={product.stock}
              placeholder="No limit"
              onChange={(event) =>
                onChange({ ...product, stock: event.target.value })
              }
            />
          </div>
        </div>
      </div>
    </article>
  )
}
