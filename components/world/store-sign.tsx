'use client'

import { RoundedBox, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { CanvasTexture, type Mesh, type MeshBasicMaterial } from 'three'

import type { SceneConfig } from '@/lib/world/scene-config'

import { INK } from './decor'

const DISPLAY_FONT = '/fonts/bricolage-grotesque-600.woff'
const SANS_FONT = '/fonts/instrument-sans-500.woff'
const MONO_FONT = '/fonts/geist-mono-500.woff'

function useGlowTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 128
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 64)
    gradient.addColorStop(0, 'rgba(255,255,255,0.85)')
    gradient.addColorStop(0.55, 'rgba(255,255,255,0.28)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 128, 128)
    return new CanvasTexture(canvas)
  }, [])
}

/** The LivePill promoted to signage: a small breathing dot beside mono copy. */
function LiveDot({ closed }: { closed: boolean }) {
  const dot = useRef<Mesh>(null)

  useFrame(({ clock }) => {
    if (!dot.current || closed) return
    const pulse = 0.75 + 0.25 * Math.sin(clock.elapsedTime * 2.4)
    dot.current.scale.setScalar(0.85 + 0.3 * pulse)
    ;(dot.current.material as MeshBasicMaterial).opacity = 0.55 + 0.45 * pulse
  })

  return (
    <mesh ref={dot}>
      <circleGeometry args={[0.032, 20]} />
      <meshBasicMaterial color={closed ? '#a7a29b' : '#3e8d61'} transparent />
    </mesh>
  )
}

/**
 * Physical signboard on the back wall: ink frame, warm-white face, the drop
 * title in the display face. The accent appears only as light — the soft
 * halo plane behind the board (faked with a gradient texture; real bloom is
 * a mobile perf trap, per docs/3d-world-design.md §5).
 */
export function StoreSign({
  config,
  accent,
  closed,
}: {
  config: SceneConfig
  accent: string
  closed: boolean
}) {
  const glow = useGlowTexture()
  const statusText = closed ? 'CLOSED' : 'LIVE IN STORE'

  return (
    <group position={[0, 2.42, -4.93]}>
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[6.4, 3.1]} />
        <meshBasicMaterial
          map={glow}
          color={accent}
          transparent
          opacity={closed ? 0.22 : 0.55}
          depthWrite={false}
        />
      </mesh>

      <RoundedBox args={[4.5, 1.5, 0.1]} radius={0.05} smoothness={3} castShadow>
        <meshStandardMaterial color={INK} roughness={0.82} />
      </RoundedBox>
      <mesh position={[0, 0, 0.052]}>
        <planeGeometry args={[4.3, 1.3]} />
        <meshStandardMaterial color="#fffdf8" roughness={0.9} />
      </mesh>

      <group position={[0, 0.47, 0.06]}>
        <group position={[-0.62, 0, 0]}>
          <LiveDot closed={closed} />
        </group>
        <Text
          font={MONO_FONT}
          fontSize={0.082}
          letterSpacing={0.24}
          color="#706a63"
          anchorX="left"
          anchorY="middle"
          position={[-0.52, 0, 0]}
        >
          {statusText}
        </Text>
      </group>

      <Text
        font={DISPLAY_FONT}
        fontSize={0.34}
        maxWidth={4}
        textAlign="center"
        lineHeight={1.05}
        color={INK}
        anchorX="center"
        anchorY="middle"
        position={[0, 0.02, 0.06]}
      >
        {config.sign.title}
      </Text>

      {config.sign.sellerName && (
        <Text
          font={SANS_FONT}
          fontSize={0.115}
          color="#706a63"
          anchorX="center"
          anchorY="middle"
          position={[0, -0.45, 0.06]}
        >
          by {config.sign.sellerName}
        </Text>
      )}
    </group>
  )
}
