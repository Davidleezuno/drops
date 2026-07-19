'use client'

import { useMemo } from 'react'
import { Shape, ShapeGeometry } from 'three'

// Shared decor palette: the warm-neutral ramp plus quiet clay/sage tones.
// Everything matte (roughness >= 0.8), nothing saturated — the design doc's
// rule that product photos stay the only loud color in the room.
export const INK = '#2d2925'
const CLAY = '#bc8163'
const CLAY_DARK = '#a06e52'
const SAGE = ['#87976f', '#758862', '#93a17c'] as const

export function RoundedRect({
  width,
  depth,
  radius,
  color,
  position,
  opacity = 1,
}: {
  width: number
  depth: number
  radius: number
  color: string
  position: [number, number, number]
  opacity?: number
}) {
  const geometry = useMemo(() => {
    const shape = new Shape()
    const w = width / 2
    const d = depth / 2
    shape.moveTo(-w + radius, -d)
    shape.lineTo(w - radius, -d)
    shape.quadraticCurveTo(w, -d, w, -d + radius)
    shape.lineTo(w, d - radius)
    shape.quadraticCurveTo(w, d, w - radius, d)
    shape.lineTo(-w + radius, d)
    shape.quadraticCurveTo(-w, d, -w, d - radius)
    shape.lineTo(-w, -d + radius)
    shape.quadraticCurveTo(-w, -d, -w + radius, -d)
    return new ShapeGeometry(shape, 8)
  }, [width, depth, radius])

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={position}
      receiveShadow
    >
      <meshStandardMaterial
        color={color}
        roughness={0.97}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </mesh>
  )
}

/** Potted plant, still by design: clay pot + a cluster of matte sage blobs. */
export function Plant({
  position,
  scale = 1,
  tall = false,
}: {
  position: [number, number, number]
  scale?: number
  tall?: boolean
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.16, 0]} castShadow>
        <cylinderGeometry args={[0.17, 0.13, 0.32, 20]} />
        <meshStandardMaterial color={CLAY} roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.325, 0]}>
        <cylinderGeometry args={[0.145, 0.145, 0.02, 20]} />
        <meshStandardMaterial color="#4a4038" roughness={1} />
      </mesh>
      {tall ? (
        <>
          <mesh position={[0, 0.75, 0]} castShadow>
            <cylinderGeometry args={[0.022, 0.03, 0.9, 8]} />
            <meshStandardMaterial color="#6d5a44" roughness={0.95} />
          </mesh>
          <mesh position={[0, 1.28, 0]} castShadow>
            <icosahedronGeometry args={[0.34, 1]} />
            <meshStandardMaterial color={SAGE[0]} roughness={0.95} flatShading />
          </mesh>
          <mesh position={[0.22, 1.02, 0.08]} castShadow>
            <icosahedronGeometry args={[0.24, 1]} />
            <meshStandardMaterial color={SAGE[1]} roughness={0.95} flatShading />
          </mesh>
          <mesh position={[-0.2, 1.08, -0.1]} castShadow>
            <icosahedronGeometry args={[0.21, 1]} />
            <meshStandardMaterial color={SAGE[2]} roughness={0.95} flatShading />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[0, 0.46, 0]} castShadow>
            <icosahedronGeometry args={[0.19, 1]} />
            <meshStandardMaterial color={SAGE[0]} roughness={0.95} flatShading />
          </mesh>
          <mesh position={[0.13, 0.4, 0.07]} castShadow>
            <icosahedronGeometry args={[0.13, 1]} />
            <meshStandardMaterial color={SAGE[1]} roughness={0.95} flatShading />
          </mesh>
          <mesh position={[-0.12, 0.42, -0.06]} castShadow>
            <icosahedronGeometry args={[0.12, 1]} />
            <meshStandardMaterial color={SAGE[2]} roughness={0.95} flatShading />
          </mesh>
        </>
      )}
    </group>
  )
}

/**
 * Small framed print in the warm-neutral ramp: an ink frame around a quiet
 * abstract arch. Deliberately near-monochrome so it never competes with the
 * seller's product photos.
 */
export function WallArt({
  position,
  rotation,
  variant = 'arch',
}: {
  position: [number, number, number]
  rotation: [number, number, number]
  variant?: 'arch' | 'sun'
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow>
        <boxGeometry args={[0.62, 0.78, 0.05]} />
        <meshStandardMaterial color={INK} roughness={0.82} />
      </mesh>
      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={[0.52, 0.68]} />
        <meshStandardMaterial color="#f6efe3" roughness={0.96} />
      </mesh>
      {variant === 'arch' ? (
        <>
          <mesh position={[0, 0.05, 0.035]}>
            <circleGeometry args={[0.17, 32, 0, Math.PI]} />
            <meshStandardMaterial color="#cdbda6" roughness={0.96} />
          </mesh>
          <mesh position={[0, -0.09, 0.035]}>
            <planeGeometry args={[0.34, 0.28]} />
            <meshStandardMaterial color="#cdbda6" roughness={0.96} />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[0, 0.07, 0.035]}>
            <circleGeometry args={[0.15, 32]} />
            <meshStandardMaterial color="#d3b891" roughness={0.96} />
          </mesh>
          <mesh position={[0, -0.19, 0.035]}>
            <planeGeometry args={[0.36, 0.04]} />
            <meshStandardMaterial color="#cdbda6" roughness={0.96} />
          </mesh>
        </>
      )}
    </group>
  )
}

/** Kraft parcel boxes and a card stand — quiet counter clutter. */
export function CounterClutter({
  position,
}: {
  position: [number, number, number]
}) {
  return (
    <group position={position}>
      <mesh position={[0, 0.09, 0]} rotation={[0, 0.22, 0]} castShadow>
        <boxGeometry args={[0.34, 0.18, 0.26]} />
        <meshStandardMaterial color="#d4c1a2" roughness={0.95} />
      </mesh>
      <mesh position={[0.03, 0.235, 0.02]} rotation={[0, -0.14, 0]} castShadow>
        <boxGeometry args={[0.24, 0.11, 0.19]} />
        <meshStandardMaterial color="#c8b28f" roughness={0.95} />
      </mesh>
      <mesh position={[0.42, 0.1, 0.05]} rotation={[-0.28, -0.35, 0]} castShadow>
        <boxGeometry args={[0.16, 0.2, 0.012]} />
        <meshStandardMaterial color="#fffdf8" roughness={0.9} />
      </mesh>
      <mesh position={[-0.36, 0.07, 0.06]} castShadow>
        <cylinderGeometry args={[0.045, 0.06, 0.14, 14]} />
        <meshStandardMaterial color={CLAY_DARK} roughness={0.92} />
      </mesh>
    </group>
  )
}
