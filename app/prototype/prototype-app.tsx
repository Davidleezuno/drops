'use client'

/**
 * PROTOTYPE — throwaway. Shell for /prototype: full-screen scene + overlay
 * chrome + the floating variant switcher (?variant=shophouse|front-room|conservatory).
 */

import { ArrowLeft, ArrowRight } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { DEFAULT_VARIANT, VARIANTS } from './data'

const SceneCanvas = dynamic(() => import('./scene-canvas'), { ssr: false })

export function PrototypeApp({ variantKey }: { variantKey: string }) {
  const router = useRouter()
  const index = Math.max(0, VARIANTS.findIndex((v) => v.key === variantKey))
  const variant = VARIANTS[index] ?? VARIANTS[0]

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
    <div className="fixed inset-0 bg-[#e9e0cf]">
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
      <div className="absolute left-5 top-5 max-w-xs rounded-2xl border border-black/5 bg-white/85 px-5 py-4 shadow-sm backdrop-blur-sm">
        <p className="font-mono text-[10px] uppercase tracking-widest text-[#8a8175]">
          drops / prototype
        </p>
        <h1 className="mt-1.5 font-display text-2xl font-extrabold leading-tight text-[#2d2925]">
          {variant.seller.name}
        </h1>
        <p className="text-sm font-medium text-[#5c554c]">{variant.seller.dropTitle}</p>
        <p className="mt-2 text-xs leading-relaxed text-[#8a8175]">{variant.blurb}</p>
      </div>

      {/* hint, bottom left */}
      <p className="absolute bottom-5 left-5 font-mono text-[10px] uppercase tracking-widest text-[#6b6257]/70">
        drag to look · scroll to zoom
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
