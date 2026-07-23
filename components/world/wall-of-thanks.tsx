'use client'

import { Html, RoundedBox } from '@react-three/drei'
import { useEffect, useMemo, useState } from 'react'

import type { Appreciation } from '@/lib/social-events'

const VISIBLE_NOTES = 3

export function WallOfThanks({
  appreciations,
  accent,
}: {
  appreciations: Appreciation[]
  accent: string
}) {
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    if (appreciations.length <= VISIBLE_NOTES) return
    const timer = window.setInterval(
      () => setOffset((current) => (current + 1) % appreciations.length),
      5_500,
    )
    return () => window.clearInterval(timer)
  }, [appreciations.length])

  const visible = useMemo(
    () =>
      Array.from(
        { length: Math.min(VISIBLE_NOTES, appreciations.length) },
        (_, index) => appreciations[(offset + index) % appreciations.length],
      ),
    [appreciations, offset],
  )

  return (
    <group
      position={[0, 1.14, -4.43]}
      rotation={[0, 0, -0.018]}
    >
      {/* A quiet oak noticeboard in the back-wall position vacated by the
          store sign. The adjacent stations stop short of this centre bay. */}
      <RoundedBox
        args={[1.16, 1.46, 0.045]}
        radius={0.018}
        smoothness={2}
        castShadow
      >
        <meshStandardMaterial color="#765337" roughness={0.9} />
      </RoundedBox>
      <mesh position={[0, 0, 0.026]}>
        <planeGeometry args={[1.05, 1.35]} />
        <meshStandardMaterial color="#eadfca" roughness={0.98} />
      </mesh>

      <Html
        transform
        position={[0, 0, 0.03]}
        distanceFactor={1.42}
        style={{ pointerEvents: 'none' }}
      >
        <section
          aria-label="Wall of thanks"
          className="h-[360px] w-[280px] overflow-hidden bg-[#eadfca] px-5 py-4 text-[#493c32]"
        >
          <header className="border-b border-[#6f5b49]/25 pb-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-[22px] leading-none font-semibold">
                Wall of thanks
              </h2>
              <span className="font-mono text-[8px] text-[#7b6a5d] tabular-nums">
                {String(appreciations.length).padStart(2, '0')} notes
              </span>
            </div>
            <div
              className="mt-2 h-px w-10 opacity-65"
              style={{ backgroundColor: accent }}
            />
          </header>

          <div
            className="mt-2.5 grid content-start divide-y divide-[#6f5b49]/15"
            aria-live="polite"
          >
            {visible.length ? (
              visible.map((item) => (
                <article
                  key={item.id}
                  className="motion-safe:animate-rise py-2.5"
                >
                  <p className="line-clamp-2 font-serif text-[13px] leading-snug italic">
                    &ldquo;{item.note}&rdquo;
                  </p>
                  <p className="mt-1 truncate font-mono text-[7px] tracking-[0.08em] text-[#7b6a5d] uppercase">
                    {item.firstName} · {item.productName}
                  </p>
                </article>
              ))
            ) : (
              <div className="pt-4">
                <p className="font-serif text-[14px] leading-snug italic text-[#65594f]">
                  Kind words from buyers will appear here.
                </p>
              </div>
            )}
          </div>
        </section>
      </Html>
    </group>
  )
}
