'use client'

import { Html, RoundedBox } from '@react-three/drei'
import { useEffect, useMemo, useState } from 'react'

import type { Appreciation } from '@/lib/social-events'

const VISIBLE_NOTES = 3

export function WallOfAppreciation({
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
    <group position={[0.3, 0, -0.7]}>
      <RoundedBox
        args={[3.15, 2.35, 0.14]}
        radius={0.06}
        smoothness={3}
        position={[0, 1.42, 0]}
        castShadow
      >
        <meshStandardMaterial color="#332820" roughness={0.82} />
      </RoundedBox>
      <mesh position={[-1.25, 0.42, -0.03]} castShadow>
        <cylinderGeometry args={[0.055, 0.07, 0.82, 12]} />
        <meshStandardMaterial color="#9b744d" roughness={0.78} />
      </mesh>
      <mesh position={[1.25, 0.42, -0.03]} castShadow>
        <cylinderGeometry args={[0.055, 0.07, 0.82, 12]} />
        <meshStandardMaterial color="#9b744d" roughness={0.78} />
      </mesh>
      <mesh position={[-1.25, 0.05, 0.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.05, 20]} />
        <meshStandardMaterial color="#8b6848" roughness={0.9} />
      </mesh>
      <mesh position={[1.25, 0.05, 0.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.05, 20]} />
        <meshStandardMaterial color="#8b6848" roughness={0.9} />
      </mesh>

      <Html
        transform
        position={[0, 1.42, 0.085]}
        distanceFactor={1.55}
        style={{ pointerEvents: 'none' }}
      >
        <section
          aria-label="Wall of appreciation"
          className="w-[420px] overflow-hidden rounded-[18px] border border-white/10 bg-[#f7f0e3] p-5 text-[#332820] shadow-2xl"
        >
          <header className="flex items-end justify-between gap-4 border-b border-[#332820]/15 pb-3">
            <div>
              <p className="font-mono text-[10px] tracking-[0.24em] uppercase" style={{ color: accent }}>
                From the community
              </p>
              <h2 className="mt-1 font-display text-[27px] leading-none font-semibold">
                Wall of appreciation
              </h2>
            </div>
            <span className="rounded-full bg-[#332820] px-2.5 py-1 font-mono text-[9px] text-white tabular-nums">
              {appreciations.length} notes
            </span>
          </header>

          <div className="mt-3 grid min-h-[220px] content-start gap-2.5" aria-live="polite">
            {visible.length ? (
              visible.map((item) => (
                <article
                  key={item.id}
                  className="motion-safe:animate-rise rounded-xl border border-[#332820]/10 bg-white/80 px-3.5 py-3 shadow-sm"
                >
                  <p className="line-clamp-2 font-serif text-[15px] leading-snug italic">
                    &ldquo;{item.note}&rdquo;
                  </p>
                  <p className="mt-1.5 truncate font-mono text-[9px] tracking-wide text-[#70655c]">
                    {item.firstName} · bought {item.productName}
                  </p>
                </article>
              ))
            ) : (
              <div className="flex min-h-[220px] items-center justify-center px-8 text-center">
                <div>
                  <p className="font-serif text-lg italic text-[#65594f]">
                    The first kind word could be yours.
                  </p>
                  <p className="mt-2 font-mono text-[9px] tracking-wider text-[#897a6e] uppercase">
                    Buyers can leave a note after checkout
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </Html>
    </group>
  )
}
