'use client'

/**
 * PROTOTYPE — throwaway. Shell for /prototype: full-screen scene + overlay
 * chrome + the floating variant switcher (?variant=shophouse|front-room|conservatory).
 */

import { ArrowLeft, ArrowRight } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { VARIANTS } from './data'
import type { ProtoSeller } from './data'

const SceneCanvas = dynamic(() => import('./scene-canvas'), { ssr: false })

export function PrototypeApp({
  variantKey,
  store,
  foodStore,
}: {
  variantKey: string
  store: ProtoSeller | null
  foodStore: ProtoSeller | null
}) {
  const router = useRouter()
  const index = Math.max(0, VARIANTS.findIndex((v) => v.key === variantKey))
  const baseVariant = VARIANTS[index] ?? VARIANTS[0]
  const variantStore = baseVariant.key === 'domestic-loop'
    ? foodStore
    : (baseVariant.key === 'front-room' || baseVariant.key === 'domestic-circuit')
      ? store
      : null
  const variant = variantStore
    ? { ...baseVariant, seller: variantStore, blurb: variantStore.tagline }
    : baseVariant

  const go = (next: number) => {
    const wrapped = (next + VARIANTS.length) % VARIANTS.length
    router.replace(`/prototype?variant=${VARIANTS[wrapped].key}`)
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.closest('input, textarea, [contenteditable]')) return
      if (event.key === 'ArrowLeft') go(index - 1)
      if (event.key === 'ArrowRight') go(index + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#cbbda6]">
      <SceneCanvas variant={variant} />

      {/* photographic vignette — cheap, does a lot */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 75% at 50% 42%, transparent 62%, rgba(43,36,28,0.16) 100%)',
        }}
      />

      {/* seller card, top left */}
      <div className="absolute left-4 top-4 max-w-[280px] rotate-[-0.35deg] border border-[#302a24]/15 bg-[#e6dcc9]/92 px-5 py-4 shadow-[3px_5px_20px_rgba(48,42,36,0.14)] backdrop-blur-[2px] sm:left-6 sm:top-6 sm:max-w-xs">
        <span className="absolute -top-2 left-1/2 h-4 w-20 -translate-x-1/2 rotate-[-2deg] bg-[#c6b17a]/65" />
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#776b5b]">
          front room / open today
        </p>
        <h1 className="mt-2 font-display text-2xl font-extrabold leading-[0.95] text-[#302a24]">
          {variant.seller.name}
        </h1>
        <p className="mt-1.5 font-display text-sm font-semibold text-[#5e6655]">{variant.seller.dropTitle}</p>
        <p className="mt-2 text-xs leading-relaxed text-[#716759]">{variant.blurb}</p>
        {variant.seller.href && (
          <a
            href={variant.seller.href}
            className="mt-3 inline-flex border-b border-[#302a24]/35 pb-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-[#302a24] transition hover:border-[#302a24]"
          >
            View live storefront ↗
          </a>
        )}
      </div>

      {/* hint, bottom left */}
      <p className="absolute bottom-5 left-5 hidden font-mono text-[9px] uppercase tracking-[0.2em] text-[#493f34]/65 sm:block">
        drag the room · scroll closer
      </p>

      {/* variant switcher, bottom centre */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-[#2d2925] p-1.5 text-white shadow-lg">
          <button
            onClick={() => go(index - 1)}
            className="rounded-full p-2 transition hover:bg-white/10"
            aria-label="Previous variant"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="min-w-52 text-center">
            <p className="text-[13px] font-semibold leading-tight">
              {variant.label} — {variant.name}
            </p>
            <p className="font-mono text-[9px] uppercase tracking-widest text-white/50">
              storefront concept {index + 1}/{VARIANTS.length}
            </p>
          </div>
          <button
            onClick={() => go(index + 1)}
            className="rounded-full p-2 transition hover:bg-white/10"
            aria-label="Next variant"
          >
            <ArrowRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  )
}
