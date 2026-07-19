'use client'

import { useEffect, useRef, useState } from 'react'

import { REACTION_EMOJI, type ReactionEmoji } from '@/lib/social-events'
import { cn } from '@/lib/utils'

const MAX_LIVE_FLOATERS = 20
const FLOATER_LIFETIME_MS = 2_000
const HOLD_FIRE_INTERVAL_MS = 250

type Floater = {
  id: number
  emoji: ReactionEmoji
  driftPx: number
  offsetPx: number
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return reduced
}

/**
 * Emoji reactions (future-ideas §1c): pure atmosphere. One fixed trigger pill,
 * floaters ride a single pointer-events-none layer (transform/opacity only,
 * gone in ~2s, capped) with overflow ticking a mono counter chip instead of
 * spawning DOM. Reduced motion: no floaters, the chip ticks. Nothing persists.
 */
export function ReactionLayer({
  subscribe,
  react,
}: {
  subscribe: (listener: (emoji: ReactionEmoji) => void) => () => void
  react: (emoji: ReactionEmoji) => void
}) {
  const reducedMotion = usePrefersReducedMotion()
  const [floaters, setFloaters] = useState<Floater[]>([])
  const [overflowCount, setOverflowCount] = useState(0)
  const nextIdRef = useRef(1)
  const holdTimerRef = useRef<number | undefined>(undefined)

  useEffect(
    () =>
      subscribe((emoji) => {
        if (reducedMotion) {
          setOverflowCount((count) => count + 1)
          return
        }

        setFloaters((current) => {
          if (current.length >= MAX_LIVE_FLOATERS) {
            setOverflowCount((count) => count + 1)
            return current
          }

          const id = nextIdRef.current++
          window.setTimeout(
            () =>
              setFloaters((live) =>
                live.filter((floater) => floater.id !== id),
              ),
            FLOATER_LIFETIME_MS,
          )

          return [
            ...current,
            {
              id,
              emoji,
              driftPx: Math.round((Math.random() - 0.5) * 48),
              offsetPx: Math.round(Math.random() * 40),
            },
          ]
        })
      }),
    [subscribe, reducedMotion],
  )

  function startFiring(emoji: ReactionEmoji) {
    react(emoji)
    window.clearInterval(holdTimerRef.current)
    holdTimerRef.current = window.setInterval(
      () => react(emoji),
      HOLD_FIRE_INTERVAL_MS,
    )
  }

  function stopFiring() {
    window.clearInterval(holdTimerRef.current)
  }

  useEffect(() => () => window.clearInterval(holdTimerRef.current), [])

  return (
    <>
      {/* Floaters ride the right edge in one non-interactive layer. */}
      <div
        className="pointer-events-none fixed right-3 bottom-36 z-30 h-[45svh] w-20"
        aria-hidden
      >
        {floaters.map((floater) => (
          <span
            key={floater.id}
            className="animate-float-up absolute bottom-0 text-2xl"
            style={{
              right: `${floater.offsetPx}px`,
              ['--drift' as string]: `${floater.driftPx}px`,
            }}
          >
            {REACTION_EMOJI[floater.emoji]}
          </span>
        ))}
      </div>

      <div className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-40 flex items-center gap-2">
        {overflowCount > 0 && (
          <span
            key={overflowCount}
            className="animate-tick rounded-full border border-border bg-card px-2.5 py-1 font-mono text-xs text-muted-foreground tabular-nums shadow-sm"
          >
            +{overflowCount}
          </span>
        )}
        <div
          className={cn(
            'flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-sm',
          )}
        >
          {(Object.keys(REACTION_EMOJI) as ReactionEmoji[]).map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-label={`Send a ${emoji === 'heart' ? 'heart' : 'fire'} reaction`}
              className="flex size-10 items-center justify-center rounded-full text-lg transition-transform select-none hover:bg-secondary active:scale-90"
              onPointerDown={(event) => {
                event.preventDefault()
                startFiring(emoji)
              }}
              onPointerUp={stopFiring}
              onPointerLeave={stopFiring}
              onPointerCancel={stopFiring}
              onContextMenu={(event) => event.preventDefault()}
            >
              {REACTION_EMOJI[emoji]}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
