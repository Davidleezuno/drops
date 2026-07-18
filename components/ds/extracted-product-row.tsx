'use client'

import { Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export type ProductDraft = {
  id: string
  name: string
  variant: string
  price: string
  stock: string
}

export function ExtractedProductRow({
  index,
  product,
  canRemove,
  onChange,
  onRemove,
}: {
  index: number
  product: ProductDraft
  canRemove: boolean
  onChange: (product: ProductDraft) => void
  onRemove: () => void
}) {
  const fieldId = (field: string) => `${field}-${product.id}`

  return (
    <article className="animate-rise rounded-xl border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Item {String(index + 1).padStart(2, '0')}
        </p>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="text-muted-foreground hover:text-destructive"
          aria-label={`Remove ${product.name || `item ${index + 1}`}`}
          disabled={!canRemove}
          onClick={onRemove}
        >
          <Trash2 />
        </Button>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor={fieldId('name')}>Product</Label>
          <Input
            id={fieldId('name')}
            value={product.name}
            maxLength={120}
            required
            onChange={(event) =>
              onChange({ ...product, name: event.target.value })
            }
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={fieldId('variant')}>
            Variant <span className="text-muted-foreground">(optional)</span>
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
            <Label htmlFor={fieldId('stock')}>Stock</Label>
            <Input
              id={fieldId('stock')}
              className="font-mono tabular-nums"
              type="number"
              inputMode="numeric"
              min="1"
              max="100000"
              step="1"
              value={product.stock}
              required
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
