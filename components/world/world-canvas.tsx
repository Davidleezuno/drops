'use client'

import { Canvas } from '@react-three/fiber'
import { List, Move, MousePointer2, X } from 'lucide-react'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'

import { BuyFlow } from '@/components/ds/buy-flow'
import { stockRemaining } from '@/lib/drop-state'
import {
  REACTION_EMOJI,
  type ReactionEmoji,
} from '@/lib/social-events'
import { createClient } from '@/lib/supabase/client'
import { oklchHex } from '@/lib/theme'
import type { Drop, Product } from '@/lib/types'
import type {
  Announcement,
  ReactionEvent,
} from '@/lib/use-drop-social'
import { useWorldPresence } from '@/lib/use-world-presence'
import { presenceKey as createPresenceKey } from '@/lib/world/names'
import type { SceneConfig } from '@/lib/world/scene-config'

import type { AvatarReaction } from './avatar'
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
  socialPresenceKey: string | null
  react: (emoji: ReactionEmoji) => void
  subscribeToReactionEvents: (
    listener: (event: ReactionEvent) => void,
  ) => () => void
  onExit: () => void
  onReady: () => void
}

function WorldReactionBar({ react }: { react: (emoji: ReactionEmoji) => void }) {
  return (
    <div className="absolute right-4 bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] z-30 flex items-center gap-1 rounded-full border border-white/35 bg-white/90 p-1 shadow-lg backdrop-blur-sm">
      {(Object.keys(REACTION_EMOJI) as ReactionEmoji[]).map((emoji) => (
        <button
          key={emoji}
          type="button"
          aria-label={`Send a ${emoji} reaction`}
          className="flex size-11 items-center justify-center rounded-full text-xl transition-transform hover:bg-black/5 active:scale-90"
          onClick={() => react(emoji)}
        >
          {REACTION_EMOJI[emoji]}
        </button>
      ))}
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
  socialPresenceKey,
  react,
  subscribeToReactionEvents,
  onExit,
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
  const [reactions, setReactions] = useState<Record<string, AvatarReaction>>({})
  const [mobile, setMobile] = useState(false)
  const reactionId = useRef(1)
  const presence = useWorldPresence({
    supabase,
    dropId: drop.id,
    presenceKey: key,
  })

  useEffect(() => onReady(), [onReady])

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px), (pointer: coarse)')
    const update = () => setMobile(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  useEffect(
    () =>
      subscribeToReactionEvents((event) => {
        if (!event.key) return
        const id = reactionId.current++
        setReactions((current) => ({
          ...current,
          [event.key!]: { id, emoji: event.emoji },
        }))
        window.setTimeout(() => {
          setReactions((current) => {
            if (current[event.key!]?.id !== id) return current
            const next = { ...current }
            delete next[event.key!]
            return next
          })
        }, 1_900)
      }),
    [subscribeToReactionEvents],
  )

  const selectedProduct = selectedId
    ? products.find((product) => product.id === selectedId) ?? null
    : null

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
            shadows={!mobile}
            onSelectProduct={(product) => setSelectedId(product.id)}
          />
          {presence.remotes.map((shopper) => (
            <RemoteAvatar
              key={shopper.key}
              shopper={shopper}
              poses={presence.remotePoses}
              reaction={reactions[shopper.key]}
            />
          ))}
          <PlayerControls
            input={input}
            name={presence.identity.name}
            tint={presence.identity.tint}
            reaction={reactions[key]}
            enabled={!selectedProduct}
            onPose={presence.broadcastPose}
          />
        </Suspense>
      </Canvas>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
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

      <div className="pointer-events-none absolute bottom-5 left-1/2 z-20 hidden -translate-x-1/2 items-center gap-3 rounded-full border border-white/25 bg-black/35 px-4 py-2 text-xs text-white backdrop-blur-sm md:flex">
        <span className="inline-flex items-center gap-1.5">
          <Move className="size-3.5" /> WASD to walk
        </span>
        <span className="h-3 w-px bg-white/30" />
        <span className="inline-flex items-center gap-1.5">
          <MousePointer2 className="size-3.5" /> drag to look
        </span>
      </div>

      {!selectedProduct && <MobileJoystick input={input} />}
      <WorldReactionBar react={react} />
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
