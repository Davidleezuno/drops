'use client'

import Image from 'next/image'
import {
  ChevronDown,
  ImagePlus,
  LoaderCircle,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { useState } from 'react'

import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { ProductDisplayKind } from '@/lib/drop-builder'

export type ProductVariantDraft = {
  id: string
  label: string
  price: string
  stock: string
}

export type CustomizationDraft = {
  id: string
  name: string
  values: string[]
}

export type ProductDraft = {
  id: string
  name: string
  variant: string
  price: string
  stock: string
  imageUrl: string | null
  imageSource: 'source' | 'uploaded' | 'generated' | null
  sourceImageIndex: number | null
  displayKind: ProductDisplayKind
  inventoryChoiceName: string
  variants: ProductVariantDraft[]
  customizations: CustomizationDraft[]
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
  enhancementReady,
  error,
  onChange,
  onRemove,
  onUpload,
  onImprove,
}: {
  product: ProductDraft
  canRemove: boolean
  busy: boolean
  enhancementReady?: boolean
  error?: string
  onChange: (product: ProductDraft) => void
  onRemove: () => void
  onUpload: (product: ProductDraft, file: File) => void
  onImprove: (product: ProductDraft) => void
}) {
  const [choicesOpen, setChoicesOpen] = useState(
    product.variants.length > 0 || product.customizations.length > 0,
  )
  const fieldId = (field: string) => `${field}-${product.id}`
  const itemLabel = product.name.trim() || 'this item'
  const choiceSummary = [
    product.variants.length
      ? product.inventoryChoiceName.trim().toLowerCase() === 'size'
        ? `${product.variants.length} sizes`
        : `${product.variants.length} stock options`
      : null,
    ...product.customizations.map((group) => group.name.trim()).filter(Boolean),
  ]
    .filter(Boolean)
    .join(' · ')

  function addSizePreset() {
    const price = product.price
    onChange({
      ...product,
      inventoryChoiceName: 'Size',
      variants: ['S', 'M', 'L', 'XL'].map((label) => ({
        id: crypto.randomUUID(),
        label,
        price,
        stock: '',
      })),
    })
    setChoicesOpen(true)
  }

  function addVariant() {
    onChange({
      ...product,
      inventoryChoiceName: product.inventoryChoiceName || 'Option',
      variants: [
        ...product.variants,
        {
          id: crypto.randomUUID(),
          label: '',
          price: product.price,
          stock: '',
        },
      ],
    })
  }

  function addCustomization(preset?: 'chilli') {
    onChange({
      ...product,
      customizations: [
        ...product.customizations,
        preset === 'chilli'
          ? {
              id: crypto.randomUUID(),
              name: 'Chilli preference',
              values: ['Chilli', 'No chilli'],
            }
          : {
              id: crypto.randomUUID(),
              name: '',
              values: ['', ''],
            },
      ],
    })
    setChoicesOpen(true)
  }

  return (
    <article className="animate-rise overflow-hidden rounded-2xl border border-border bg-card sm:grid sm:grid-cols-[minmax(220px,32%)_1fr]">
      {/* The photo only earns full height once it exists; an empty slot stays a
          thin prompt so the seller can keep scrolling. */}
      <div
        className={cn(
          'relative w-full overflow-hidden bg-muted sm:min-h-80 sm:h-auto',
          product.imageUrl ? 'aspect-[4/3] sm:aspect-auto' : 'h-20',
        )}
      >
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={`${product.name || 'Item'} photo`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 280px"
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

      <div className="min-w-0">
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
            {busy
              ? 'Working…'
              : enhancementReady
                ? 'Enhance ready'
                : 'Enhance Image'}
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
            Short detail <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id={fieldId('variant')}
            value={product.variant}
            maxLength={120}
            placeholder="e.g. Heavyweight cotton"
            onChange={(event) =>
              onChange({ ...product, variant: event.target.value })
            }
          />
        </div>

        <div className={product.variants.length ? '' : 'grid grid-cols-2 gap-3'}>
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
              onChange={(event) => {
                const nextPrice = event.target.value
                onChange({
                  ...product,
                  price: nextPrice,
                  variants: product.variants.map((variant) =>
                    variant.price === product.price
                      ? { ...variant, price: nextPrice }
                      : variant,
                  ),
                })
              }}
            />
          </div>
          {!product.variants.length && <div className="space-y-1.5">
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
          </div>}
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
            aria-expanded={choicesOpen}
            onClick={() => setChoicesOpen((current) => !current)}
          >
            <span>
              <span className="block text-sm font-medium">Customize</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {choiceSummary || 'Sizes, flavours or preferences'}
              </span>
            </span>
            <ChevronDown
              className={cn(
                'size-4 shrink-0 text-muted-foreground transition-transform',
                choicesOpen && 'rotate-180',
              )}
            />
          </button>

          {choicesOpen && (
            <div className="space-y-5 border-t border-border bg-muted/30 p-3">
              <section>
                <div>
                  <p className="text-sm font-medium">Choices with their own stock</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    Use this for sizes or any option that can sell out separately.
                  </p>
                </div>

                {!product.variants.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={addSizePreset}>
                      Add sizes S–XL
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={addVariant}>
                      <Plus /> Custom
                    </Button>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2.5">
                    <div className="space-y-1.5">
                      <Label htmlFor={fieldId('inventory-choice')}>Choice name</Label>
                      <Input
                        id={fieldId('inventory-choice')}
                        value={product.inventoryChoiceName}
                        maxLength={40}
                        placeholder="e.g. Size"
                        onChange={(event) =>
                          onChange({
                            ...product,
                            inventoryChoiceName: event.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-[1fr_0.9fr_0.8fr_2rem] gap-1.5 px-0.5 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                      <span>Value</span><span>Price</span><span>Stock</span><span />
                    </div>
                    {product.variants.map((variant) => (
                      <div key={variant.id} className="grid grid-cols-[1fr_0.9fr_0.8fr_2rem] gap-1.5">
                        <Input
                          aria-label={`${product.inventoryChoiceName || 'Option'} value`}
                          value={variant.label}
                          maxLength={60}
                          placeholder="M"
                          onChange={(event) =>
                            onChange({
                              ...product,
                              variants: product.variants.map((candidate) =>
                                candidate.id === variant.id
                                  ? { ...candidate, label: event.target.value }
                                  : candidate,
                              ),
                            })
                          }
                        />
                        <Input
                          aria-label={`${variant.label || 'Option'} price`}
                          type="number"
                          inputMode="decimal"
                          min="0.01"
                          step="0.01"
                          value={variant.price}
                          placeholder={product.price || '0'}
                          onChange={(event) =>
                            onChange({
                              ...product,
                              variants: product.variants.map((candidate) =>
                                candidate.id === variant.id
                                  ? { ...candidate, price: event.target.value }
                                  : candidate,
                              ),
                            })
                          }
                        />
                        <Input
                          aria-label={`${variant.label || 'Option'} stock`}
                          type="number"
                          inputMode="numeric"
                          min="0"
                          step="1"
                          value={variant.stock}
                          placeholder="∞"
                          onChange={(event) =>
                            onChange({
                              ...product,
                              variants: product.variants.map((candidate) =>
                                candidate.id === variant.id
                                  ? { ...candidate, stock: event.target.value }
                                  : candidate,
                              ),
                            })
                          }
                        />
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Remove ${variant.label || 'option'}`}
                          disabled={product.variants.length <= 2}
                          onClick={() =>
                            onChange({
                              ...product,
                              variants: product.variants.filter(
                                (candidate) => candidate.id !== variant.id,
                              ),
                            })
                          }
                        >
                          <X />
                        </Button>
                      </div>
                    ))}
                    <div className="flex items-center justify-between gap-2">
                      <Button type="button" size="sm" variant="ghost" onClick={addVariant}>
                        <Plus /> Add value
                      </Button>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          onChange({
                            ...product,
                            inventoryChoiceName: '',
                            variants: [],
                          })
                        }
                      >
                        Remove stock choices
                      </button>
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Leave stock blank to sell without a limit. Use 0 to show an unavailable option.
                    </p>
                  </div>
                )}
              </section>

              <section className="border-t border-border pt-4">
                <p className="text-sm font-medium">Choices that share stock</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Preferences are saved with the order but use this item&rsquo;s total stock.
                </p>

                {product.customizations.map((group) => (
                  <div key={group.id} className="mt-3 rounded-lg border border-border bg-background p-2.5">
                    <div className="flex items-center gap-2">
                      <Input
                        aria-label="Buyer choice name"
                        value={group.name}
                        maxLength={40}
                        placeholder="e.g. Chilli preference"
                        onChange={(event) =>
                          onChange({
                            ...product,
                            customizations: product.customizations.map((candidate) =>
                              candidate.id === group.id
                                ? { ...candidate, name: event.target.value }
                                : candidate,
                            ),
                          })
                        }
                      />
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Remove buyer choice"
                        onClick={() =>
                          onChange({
                            ...product,
                            customizations: product.customizations.filter(
                              (candidate) => candidate.id !== group.id,
                            ),
                          })
                        }
                      >
                        <X />
                      </Button>
                    </div>
                    <Input
                      className="mt-2"
                      aria-label="Buyer choice values"
                      value={group.values.join(', ')}
                      maxLength={240}
                      placeholder="e.g. Chilli, No chilli"
                      onChange={(event) =>
                        onChange({
                          ...product,
                          customizations: product.customizations.map((candidate) =>
                            candidate.id === group.id
                              ? {
                                  ...candidate,
                                  values: event.target.value
                                    .split(',')
                                    .map((value) => value.trimStart()),
                                }
                              : candidate,
                          ),
                        })
                      }
                    />
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      Separate options with commas.
                    </p>
                  </div>
                ))}

                {product.customizations.length < 2 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => addCustomization()}>
                      <Plus /> Custom choice
                    </Button>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
        </div>
      </div>
    </article>
  )
}
