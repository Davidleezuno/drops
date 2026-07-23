'use client'

import { RoundedBox, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Mesh, MeshBasicMaterial } from 'three'

import type { SceneConfig } from '@/lib/world/scene-config'

import { INK } from './decor'

const DISPLAY_FONT = '/fonts/bricolage-grotesque-600.woff'
const SANS_FONT = '/fonts/instrument-sans-500.woff'
const MONO_FONT = '/fonts/geist-mono-500.woff'

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
 * A real shop sign, not a billboard: a wooden fascia suspended from the
 * centre beam, with a seller-accent rim and a hand-hung half-degree tilt.
 * It stays still so the sign reads as architecture rather than UI.
 */
export function StoreSign({
  config,
  accent,
  closed,
  position = [0, 2.42, -1.9],
  scale = 0.58,
}: {
  config: SceneConfig
  accent: string
  closed: boolean
  position?: [number, number, number]
  scale?: number
}) {
  const statusText = closed ? 'CLOSED' : 'LIVE IN STORE'

  return (
    <group position={position} rotation={[0, 0, 0.012]} scale={scale}>
      {/* Long rope drops meet the 3.5m ceiling at this placement. */}
      {[-1.85, 1.85].map((x) => (
        <group key={x}>
          <mesh position={[x, 1.29, 0]}>
            <cylinderGeometry args={[0.016, 0.016, 1.14, 6]} />
            <meshStandardMaterial color="#8a7052" roughness={0.95} />
          </mesh>
          <mesh position={[x, 0.71, 0.02]}>
            <sphereGeometry args={[0.035, 10, 10]} />
            <meshStandardMaterial color={INK} roughness={0.85} />
          </mesh>
        </group>
      ))}

      {/* Wooden board, accent-painted rim, cream painted face */}
      <RoundedBox args={[4.6, 1.44, 0.12]} radius={0.05} smoothness={3} castShadow>
        <meshStandardMaterial color="#9c7a58" roughness={0.88} />
      </RoundedBox>
      <RoundedBox args={[4.42, 1.28, 0.02]} radius={0.04} smoothness={3} position={[0, 0, 0.06]}>
        <meshStandardMaterial color={accent} roughness={0.9} />
      </RoundedBox>
      <mesh position={[0, 0, 0.075]}>
        <planeGeometry args={[4.28, 1.16]} />
        <meshStandardMaterial color="#fffdf8" roughness={0.9} />
      </mesh>

      <group position={[0, 0.42, 0.08]}>
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
        position={[0, 0.02, 0.08]}
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
          position={[0, -0.4, 0.08]}
        >
          by {config.sign.sellerName}
        </Text>
      )}
    </group>
  )
}
