'use client'

import { Html, Image as DreiImage, RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import type { Group, MeshBasicMaterial } from 'three'

import { stockRemaining } from '@/lib/drop-state'
import { sgd } from '@/lib/format'
import type { Product } from '@/lib/types'

function SparkleBurst({ color }: { color: string }) {
  const group = useRef<Group>(null)
  const elapsed = useRef(0)

  useFrame((_, delta) => {
    if (!group.current) return
    elapsed.current += delta
    const progress = Math.min(1, elapsed.current / 0.75)
    group.current.scale.setScalar(0.7 + progress * 1.6)
    group.current.traverse((object) => {
      const material = 'material' in object ? object.material : null
      if (material && !Array.isArray(material)) {
        ;(material as MeshBasicMaterial).opacity = 1 - progress
      }
    })
    if (progress >= 1) group.current.visible = false
  })

  const points = [
    [-0.7, 0.6],
    [-0.25, 0.82],
    [0.3, 0.78],
    [0.7, 0.42],
    [0.75, -0.2],
    [0.25, -0.62],
    [-0.35, -0.7],
    [-0.75, -0.25],
  ] as const

  return (
    <group ref={group} position={[0, 0, 0.16]}>
      {points.map(([x, y]) => (
        <mesh key={`${x}-${y}`} position={[x, y, 0]}>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshBasicMaterial color={color} transparent />
        </mesh>
      ))}
    </group>
  )
}

export function ProductFrame({
  product,
  imageUrl,
  accent,
  disabled,
  hero = false,
  sparkleId,
  onSelect,
}: {
  product: Product
  imageUrl: string | null
  accent: string
  disabled: boolean
  hero?: boolean
  sparkleId?: number
  onSelect: (product: Product) => void
}) {
  const [hovered, setHovered] = useState(false)
  const remaining = stockRemaining(product)
  const soldOut = remaining !== null && remaining <= 0
  const low = remaining !== null && remaining > 0 && remaining <= 3
  const canBuy = !disabled && !soldOut

  return (
    <group
      scale={hero ? 1.12 : 1}
      onClick={(event) => {
        event.stopPropagation()
        if (canBuy) onSelect(product)
      }}
      onPointerOver={(event) => {
        event.stopPropagation()
        if (!canBuy) return
        setHovered(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = ''
      }}
    >
      <RoundedBox args={[1.55, 1.62, 0.12]} radius={0.045} smoothness={3} castShadow>
        {/* Constant faint warm emissive lift: side faces catch little light
            and read as pure-black slabs from oblique angles without it. */}
        <meshStandardMaterial
          color={soldOut ? '#a7a29b' : '#2d2925'}
          roughness={0.82}
          emissive={hovered ? accent : '#59493b'}
          emissiveIntensity={hovered ? 0.25 : 0.3}
        />
      </RoundedBox>
      {/* Frame backs are visible at grazing angles (and the hero's back faces
          half the room): finish them with a cream panel instead of showing
          the raw ink box. */}
      <mesh position={[0, 0, -0.065]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.35, 1.42]} />
        <meshStandardMaterial color="#f5f0e8" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0, 0.075]}>
        <planeGeometry args={[1.35, 1.42]} />
        <meshBasicMaterial color="#f5f0e8" />
      </mesh>
      {imageUrl ? (
        <DreiImage
          url={imageUrl}
          position={[0, 0, 0.09]}
          scale={[1.28, 1.35]}
          grayscale={soldOut ? 1 : 0}
          transparent
          opacity={soldOut ? 0.5 : 1}
        />
      ) : (
        <Html
          center
          position={[0, 0, 0.11]}
          distanceFactor={4.5}
          style={{ pointerEvents: 'none' }}
        >
          <div className="pointer-events-none flex size-28 items-center justify-center rounded-xl bg-[#f3eee7] text-center text-xs font-medium text-[#706a63]">
            Photo coming soon
          </div>
        </Html>
      )}

      <Html
        center
        position={[0, -1.06, 0.1]}
        distanceFactor={4.5}
        style={{ pointerEvents: 'none' }}
      >
        <div className="pointer-events-none w-40 rounded-xl border border-black/10 bg-white/95 px-3 py-2 text-[#2d2925] shadow-sm">
          <p className="truncate text-xs font-semibold">{product.name}</p>
          <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[10px] tabular-nums">
            <span>{sgd.format(product.price)}</span>
            {soldOut ? (
              <span className="-rotate-2 rounded-full bg-[#2d2925] px-2 py-0.5 font-bold tracking-widest text-white">
                GONE
              </span>
            ) : low ? (
              <span className="rounded-full bg-[#fff0cd] px-2 py-0.5 font-semibold text-[#8a5b14]">
                {remaining} left
              </span>
            ) : remaining !== null ? (
              <span className="text-[#706a63]">{remaining} left</span>
            ) : product.stock_sold > 0 ? (
              <span className="text-[#706a63]">{product.stock_sold} sold</span>
            ) : null}
          </div>
        </div>
      </Html>

      {sparkleId !== undefined && (
        <SparkleBurst key={sparkleId} color={accent} />
      )}
    </group>
  )
}
