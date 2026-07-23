'use client'

import { Html, RoundedBox } from '@react-three/drei'
import { useEffect, useMemo, useState } from 'react'

import type { Appreciation } from '@/lib/social-events'

const VISIBLE_NOTES = 1

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
        args={[2.4, 1.68, 0.055]}
        radius={0.025}
        smoothness={2}
        castShadow
      >
        <meshStandardMaterial color="#765337" roughness={0.9} />
      </RoundedBox>
      <mesh position={[0, 0, 0.026]}>
        <planeGeometry args={[2.24, 1.52]} />
        <meshStandardMaterial color="#eadfca" roughness={0.98} />
      </mesh>

      <Html
        transform
        position={[0, 0, 0.03]}
        distanceFactor={1.87}
        style={{ pointerEvents: 'none' }}
      >
        <section
          aria-label="Wall of thanks"
          className="h-[320px] w-[480px] overflow-hidden bg-[#eadfca] px-8 py-7 text-[#493c32]"
        >
          <header className="border-b border-[#6f5b49]/25 pb-4">
            <h2 className="font-display text-[30px] leading-none font-semibold">
              Wall of thanks
            </h2>
            <div
              className="mt-3 h-0.5 w-16 opacity-65"
              style={{ backgroundColor: accent }}
            />
          </header>

          <div
            className="mt-5 grid content-start"
            aria-live="polite"
          >
            {visible.length ? (
              visible.map((item) => (
                <article
                  key={item.id}
                  className="motion-safe:animate-rise"
                >
                  <p className="line-clamp-4 font-serif text-[28px] leading-[1.18] italic">
                    &ldquo;{item.note}&rdquo;
                  </p>
                  <p className="mt-4 truncate font-mono text-[12px] tracking-[0.1em] text-[#6d5d50] uppercase">
                    {item.buyerName}
                  </p>
                </article>
              ))
            ) : (
              <div className="pt-4">
                <p className="font-serif text-[24px] leading-snug italic text-[#65594f]">
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
