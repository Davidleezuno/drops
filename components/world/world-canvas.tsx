'use client'

import { Canvas } from '@react-three/fiber'
import { Check, List, Move, MousePointer2, X } from 'lucide-react'
import { Suspense, useEffect, useMemo, useState } from 'react'

import { BuyFlow } from '@/components/ds/buy-flow'
import { stockRemaining } from '@/lib/drop-state'
import type { Appreciation } from '@/lib/social-events'
import { createClient } from '@/lib/supabase/client'
import { oklchHex } from '@/lib/theme'
import type { Drop, Product } from '@/lib/types'
import type { Announcement } from '@/lib/use-drop-social'
import { useWorldPresence } from '@/lib/use-world-presence'
import { presenceKey as createPresenceKey } from '@/lib/world/names'
import type { SceneConfig } from '@/lib/world/scene-config'

import {
  createWorldInput,
  MobileJoystick,
  PlayerControls,
  type WorldInput,
} from './controls'
import { RemoteAvatar } from './avatar'
import { StoreTemplate } from './store-template'

export type WorldDrop = Pick<
  Drop,
  | 'id'
  | 'seller_name'
  | 'fulfilment'
  | 'delivery_fee'
  | 'pickup_note'
>

export type WorldCanvasProps = {
  config: SceneConfig
  drop: WorldDrop
  products: Product[]
  windowClosed: boolean
  announcement: Announcement | null
  appreciations: Appreciation[]
  socialPresenceKey: string | null
  entering: boolean
  onExit: () => void
  onFull: () => void
  onReady: () => void
}

function PurchaseBanner({ announcement }: { announcement: Announcement | null }) {
  if (
    !announcement ||
    (announcement.kind !== 'paid' &&
      !(announcement.kind === 'summary' && announcement.paid))
  ) {
    return null
  }

  const isSummary = announcement.kind === 'summary'
  return (
    <div
      key={announcement.id}
      role="status"
      aria-live="polite"
      className="motion-safe:animate-rise pointer-events-none absolute top-[calc(env(safe-area-inset-top)+5.25rem)] left-1/2 z-30 w-[min(24rem,calc(100%-2rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-white/20 bg-[#2d2925]/95 px-4 py-3 text-white shadow-2xl backdrop-blur-md"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-live text-white">
          <Check className="size-4" strokeWidth={2.5} />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[9px] tracking-[0.18em] text-white/55 uppercase">
            Just purchased
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold">
            {isSummary
              ? `${announcement.count} items sold in the last minute`
              : `${announcement.firstName} bought ${announcement.productName}${announcement.qty > 1 ? ` ×${announcement.qty}` : ''}`}
          </p>
          {!isSummary && announcement.note && (
            <p className="mt-2 line-clamp-2 border-l-2 border-flame pl-3 font-serif text-sm leading-snug text-white/80 italic">
              &ldquo;{announcement.note}&rdquo;
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
function WorldCheckout({
  product,
  drop,
  onClose,
}: {
  product: Product
  drop: WorldDrop
  onClose: () => void
}) {
  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-black/25 p-3 sm:items-center sm:p-5">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close checkout"
        onClick={onClose}
      />
      <section className="relative max-h-[90svh] w-full max-w-md overflow-y-auto rounded-3xl border border-border bg-card p-5 text-foreground shadow-2xl">
        <button
          type="button"
          aria-label="Close checkout"
          className="absolute top-4 right-4 z-10 flex size-8 items-center justify-center rounded-full bg-muted"
          onClick={onClose}
        >
          <X className="size-4" />
        </button>
        <p className="pr-10 font-display text-2xl font-semibold">{product.name}</p>
        {product.variant && (
          <p className="mt-1 text-sm text-muted-foreground">{product.variant}</p>
        )}
        <BuyFlow
          key={product.id}
          productId={product.id}
          productName={product.name}
          unitPrice={product.price}
          remaining={stockRemaining(product)}
          inventoryChoiceName={product.inventory_choice_name}
          variants={product.variants}
          customizationGroups={product.customization_groups}
          fulfilment={drop.fulfilment}
          deliveryFee={drop.delivery_fee}
          pickupNote={drop.pickup_note}
          initialOpen
          onClose={onClose}
        />
      </section>
    </div>
  )
}

export function WorldCanvas({
  config,
  drop,
  products,
  windowClosed,
  announcement,
  appreciations,
  socialPresenceKey,
  entering,
  onExit,
  onFull,
  onReady,
}: WorldCanvasProps) {
  const supabase = useMemo(() => createClient(), [])
  const key = useMemo(
    () => socialPresenceKey ?? createPresenceKey(),
    [socialPresenceKey],
  )
  const accent = useMemo(() => oklchHex(config.accent), [config.accent])
  const input = useMemo<WorldInput>(() => createWorldInput(), [])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mobile, setMobile] = useState(false)
  const presence = useWorldPresence({
    supabase,
    dropId: drop.id,
    presenceKey: key,
    onFull,
  })

  useEffect(() => {
    if (presence.admitted) onReady()
  }, [onReady, presence.admitted])

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px), (pointer: coarse)')
    const update = () => setMobile(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  const selectedProduct = selectedId
    ? products.find((product) => product.id === selectedId) ?? null
    : null

  if (!presence.admitted) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#eee9e1] text-[#2d2925]">
      <Canvas
        className="relative z-0"
        dpr={[1, 1.5]}
        shadows={!mobile}
        camera={{ fov: 52, near: 0.1, far: 40, position: [0, 2.8, 7.4] }}
        gl={{ antialias: !mobile, powerPreference: 'high-performance' }}
        style={{ touchAction: 'none' }}
      >
        <Suspense fallback={null}>
          <StoreTemplate
            config={config}
            products={products}
            accent={accent}
            windowClosed={windowClosed}
            announcement={announcement}
            appreciations={appreciations}
            shadows={!mobile}
            onSelectProduct={(product) => setSelectedId(product.id)}
          />
          {presence.remotes.map((shopper) => (
            <RemoteAvatar
              key={shopper.key}
              shopper={shopper}
              poses={presence.remotePoses}
            />
          ))}
          <PlayerControls
            input={input}
            name={presence.identity.name}
            tint={presence.identity.tint}
            enabled={!selectedProduct}
            entering={entering}
            onPose={presence.broadcastPose}
          />
        </Suspense>
      </Canvas>

      {!entering && <PurchaseBanner announcement={announcement} />}

      <div
        className={`pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-4 pt-[calc(env(safe-area-inset-top)+1rem)] transition-opacity duration-300 ${entering ? 'opacity-0' : 'opacity-100'}`}
      >
        <div className="rounded-2xl border border-white/35 bg-white/90 px-3.5 py-2 shadow-lg backdrop-blur-sm">
          <p className="max-w-48 truncate text-sm font-semibold">{config.sign.title}</p>
          <p className="mt-0.5 font-mono text-[10px] text-black/55 tabular-nums">
            👀 {presence.shopperCount} shopping now
          </p>
        </div>
        <button
          type="button"
          className="pointer-events-auto inline-flex h-10 items-center gap-2 rounded-full border border-white/35 bg-white/95 px-4 text-sm font-semibold shadow-lg backdrop-blur-sm"
          onClick={onExit}
        >
          <List className="size-4" />
          Browse All
        </button>
      </div>

      <div
        className={`pointer-events-none absolute bottom-5 left-1/2 z-20 hidden -translate-x-1/2 items-center gap-3 rounded-full border border-white/25 bg-black/35 px-4 py-2 text-xs text-white backdrop-blur-sm transition-opacity duration-300 md:flex ${entering ? 'opacity-0' : 'opacity-100'}`}
      >
        <span className="inline-flex items-center gap-1.5">
          <Move className="size-3.5" /> WASD to walk
        </span>
        <span className="h-3 w-px bg-white/30" />
        <span className="inline-flex items-center gap-1.5">
          <MousePointer2 className="size-3.5" /> drag to look
        </span>
      </div>

      {!selectedProduct && !entering && <MobileJoystick input={input} />}
      {selectedProduct && (
        <WorldCheckout
          product={selectedProduct}
          drop={drop}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}
