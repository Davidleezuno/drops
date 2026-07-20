'use client'

import { LoaderCircle, Shuffle } from 'lucide-react'

import { ArchetypeLayout } from '@/components/ds/archetypes'
import { DropHeader } from '@/components/ds/drop-header'
import { Button, buttonVariants } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { StorefrontTheme } from '@/lib/drop-builder'
import { slugify } from '@/lib/format'
import { oklchString, storefrontScopeVars } from '@/lib/theme'
import type { Product } from '@/lib/types'
import { cn } from '@/lib/utils'

import type { ProductDraft } from './draft-item-card'

// The shipped archetypes only — drive from a local const so unbuilt ones
// never appear in the chips row (Linktree-style presets, not the schema enum).
const ARCHETYPE_CHIPS = [
  { value: 'menu', label: 'List' },
  { value: 'grid', label: 'Grid' },
] as const

type Accent = StorefrontTheme['accent']
type Nudge = 'bolder' | 'calmer'

function toPreviewProduct(product: ProductDraft, index: number): Product {
  const variants = product.variants.length
    ? product.variants.map((variant, position) => ({
        id: variant.id,
        product_id: product.id,
        label: variant.label.trim() || `Option ${position + 1}`,
        price: Number(variant.price || product.price) || 0,
        stock_total:
          variant.stock.trim() === '' ? null : Number(variant.stock),
        stock_sold: 0,
        position,
      }))
    : [
        {
          id: `${product.id}-default`,
          product_id: product.id,
          label: null,
          price: Number(product.price) || 0,
          stock_total:
            product.stock.trim() === '' ? null : Number(product.stock),
          stock_sold: 0,
          position: 0,
        },
      ]
  const cappedStocks = variants.map((variant) => variant.stock_total)
  const stockTotal = cappedStocks.some((stock) => stock === null)
    ? null
    : cappedStocks.reduce<number>((sum, stock) => sum + (stock ?? 0), 0)

  return {
    id: product.id,
    drop_id: 'preview',
    name: product.name.trim() || `Item ${index + 1}`,
    variant: product.variant.trim() || null,
    image_url: product.imageUrl,
    price: Math.min(...variants.map((variant) => variant.price)),
    stock_total: stockTotal,
    stock_sold: 0,
    inventory_choice_name:
      product.variants.length > 0
        ? product.inventoryChoiceName.trim() || 'Option'
        : null,
    customization_groups: product.customizations
      .map((group) => ({
        name: group.name.trim(),
        values: group.values.map((value) => value.trim()).filter(Boolean),
      }))
      .filter((group) => group.name && group.values.length >= 2),
    variants,
  }
}

function heroUrlFor(theme: StorefrontTheme, products: Product[]): string | null {
  if (theme.hero.source !== 'upload-crop') return null
  const target = theme.hero.sourceImageIndex ?? 0
  return (
    products.find((product, index) => index === target && product.image_url)
      ?.image_url ??
    products.find((product) => product.image_url)?.image_url ??
    null
  )
}

function SwatchButton({
  accent,
  selected,
  onSelect,
  label,
}: {
  accent: Accent
  selected: boolean
  onSelect: () => void
  label: string
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      onClick={onSelect}
      className={cn(
        'size-8 rounded-full border transition-transform',
        selected
          ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background'
          : 'border-border hover:scale-105',
      )}
      style={{ background: oklchString(accent) }}
    >
      <span className="sr-only">{label}</span>
    </button>
  )
}

export function StorefrontCard({
  theme,
  paletteCandidates,
  products,
  sellerName,
  dropSlug,
  shuffling,
  onChangeTheme,
  onShuffle,
}: {
  theme: StorefrontTheme
  paletteCandidates: Accent[]
  products: ProductDraft[]
  sellerName: string
  dropSlug: string
  shuffling: boolean
  onChangeTheme: (theme: StorefrontTheme) => void
  onShuffle: (nudge: Nudge) => void
}) {
  const sellerSlug = slugify(sellerName, 'seller')
  const previewProducts = products.map(toPreviewProduct)
  const heroUrl = heroUrlFor(theme, previewProducts)
  const scopeVars = storefrontScopeVars(theme) as React.CSSProperties

  function setAccent(accent: Accent) {
    onChangeTheme({ ...theme, accent })
  }
  function setArchetype(archetype: StorefrontTheme['archetype']) {
    onChangeTheme({ ...theme, archetype })
  }

  return (
    <section
      className="animate-rise rounded-2xl border border-border bg-card p-4 shadow-sm"
      aria-label="Storefront preview"
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium">Live preview</p>
        <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
          Buyer view
        </p>
      </div>

      {/* Live mini-preview — same React tree as the buyer page, narrowed to
          ~65% of the buyer max-w-md width. pointer-events-none keeps the
          preview BuyFlows from intercepting clicks in the editor. */}
      <div
        className="mt-3 overflow-hidden rounded-xl border border-border bg-background"
        style={scopeVars}
      >
        <div
          className="pointer-events-none mx-auto w-full max-w-[290px] px-3 pt-4"
          aria-hidden="true"
        >
          <DropHeader
            sellerName={sellerName || 'Your store'}
            sellerSlug={sellerSlug}
            dropSlug={dropSlug}
            className="mb-4"
          />
          {previewProducts.length ? (
            <ArchetypeLayout
              theme={theme}
              products={previewProducts}
              fulfilment="both"
              deliveryFee={0}
              pickupNote={null}
              heroImageUrl={heroUrl}
            />
          ) : (
            <p className="py-8 text-center text-xs text-muted-foreground">
              Add an item to see your storefront.
            </p>
          )}
        </div>
      </div>

      {/* Accent swatches */}
      <div className="mt-4 space-y-1.5">
        <Label>Accent</Label>
        <div className="flex flex-wrap gap-2">
          {paletteCandidates.map((accent, index) => (
            <SwatchButton
              key={`${accent.l}-${accent.c}-${accent.h}`}
              accent={accent}
              selected={accent === theme.accent}
              onSelect={() => setAccent(accent)}
              label={`Accent ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Archetype chips */}
      <div className="mt-4 space-y-1.5">
        <Label>Layout</Label>
        <div className="flex flex-wrap gap-2">
          {ARCHETYPE_CHIPS.map((chip) => {
            const selected = theme.archetype === chip.value
            return (
              <button
                key={chip.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setArchetype(chip.value)}
                className={cn(
                  buttonVariants({
                    variant: selected ? 'default' : 'outline',
                    size: 'sm',
                  }),
                )}
              >
                {chip.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Shuffle */}
      <div className="mt-4 space-y-1.5">
        <Label>Shuffle</Label>
        <div className="flex gap-2">
          {(['bolder', 'calmer'] as const).map((nudge) => (
            <Button
              key={nudge}
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={shuffling}
              onClick={() => onShuffle(nudge)}
            >
              {shuffling ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Shuffle />
              )}
              {nudge === 'bolder' ? 'Bolder' : 'Calmer'}
            </Button>
          ))}
        </div>
      </div>

    </section>
  )
}
