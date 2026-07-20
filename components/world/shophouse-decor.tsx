'use client'

import { Environment, Lightformer } from '@react-three/drei'
import { useMemo } from 'react'
import {
  DoubleSide,
  LatheGeometry,
  PlaneGeometry,
  Vector2,
} from 'three'

export const BRASS = '#b08d57'
export const OAK_DARK = '#74563a'
export const PLASTER = '#f2ebdf'

const BOOK_COLORS = ['#a89680', '#7d8b74', '#b98d6e', '#8b7f92', '#c0a878']

export function BorderedRug({
  width,
  depth,
  color,
  border,
  position,
}: {
  width: number
  depth: number
  color: string
  border: string
  position: [number, number, number]
}) {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={border} roughness={0.98} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.004, 0]}
        receiveShadow
      >
        <planeGeometry args={[width - 0.28, depth - 0.28]} />
        <meshStandardMaterial color={color} roughness={0.98} />
      </mesh>
    </group>
  )
}

export function BookStack({
  position,
  count = 3,
  rotation = 0,
}: {
  position: [number, number, number]
  count?: number
  rotation?: number
}) {
  const books = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => ({
        width: 0.24 + ((index * 37) % 10) / 100,
        height: 0.028 + ((index * 13) % 8) / 1000,
        depth: 0.17 + ((index * 23) % 6) / 100,
        rotation: (((index * 41) % 14) - 7) / 100,
        color: BOOK_COLORS[index % BOOK_COLORS.length],
      })),
    [count],
  )

  let y = 0
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {books.map((book, index) => {
        y += book.height / 2
        const element = (
          <mesh
            key={index}
            position={[0, y, 0]}
            rotation={[0, book.rotation, 0]}
            castShadow
          >
            <boxGeometry args={[book.width, book.height, book.depth]} />
            <meshStandardMaterial color={book.color} roughness={0.92} />
          </mesh>
        )
        y += book.height / 2
        return element
      })}
    </group>
  )
}

export function Vase({
  position,
  scale = 1,
  color = '#e8e0d2',
  stem = true,
}: {
  position: [number, number, number]
  scale?: number
  color?: string
  stem?: boolean
}) {
  const geometry = useMemo(
    () =>
      new LatheGeometry(
        [
          new Vector2(0.001, 0),
          new Vector2(0.055, 0.005),
          new Vector2(0.075, 0.05),
          new Vector2(0.082, 0.11),
          new Vector2(0.06, 0.18),
          new Vector2(0.038, 0.22),
          new Vector2(0.042, 0.25),
          new Vector2(0.05, 0.26),
        ],
        24,
      ),
    [],
  )

  return (
    <group position={position} scale={scale}>
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
      {stem && (
        <>
          <mesh position={[0.01, 0.33, 0]} rotation={[0, 0, 0.12]}>
            <cylinderGeometry args={[0.004, 0.005, 0.16, 6]} />
            <meshStandardMaterial color="#7c6a4f" roughness={0.95} />
          </mesh>
          <mesh position={[0.03, 0.42, 0]}>
            <sphereGeometry args={[0.028, 10, 10]} />
            <meshStandardMaterial color="#a5947a" roughness={0.95} />
          </mesh>
        </>
      )}
    </group>
  )
}

export function PottedOlive({
  position,
  scale = 1,
}: {
  position: [number, number, number]
  scale?: number
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.15, 0.4, 20]} />
        <meshStandardMaterial color="#b0764f" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.41, 0]}>
        <cylinderGeometry args={[0.21, 0.21, 0.035, 20]} />
        <meshStandardMaterial color="#a06a45" roughness={0.9} />
      </mesh>
      <mesh position={[0.02, 0.85, 0]} rotation={[0, 0, 0.06]} castShadow>
        <cylinderGeometry args={[0.022, 0.038, 0.9, 8]} />
        <meshStandardMaterial color="#6d5a44" roughness={0.95} />
      </mesh>
      {[
        [0, 1.5, 0, 0.34],
        [0.26, 1.34, 0.1, 0.24],
        [-0.24, 1.4, -0.08, 0.22],
        [0.05, 1.28, -0.22, 0.18],
      ].map(([x, y, z, radius], index) => (
        <mesh
          key={index}
          position={[x, y, z]}
          scale={[1, 0.82, 1]}
          castShadow
        >
          <sphereGeometry args={[radius, 18, 14]} />
          <meshStandardMaterial
            color={index % 2 ? '#8a9878' : '#7d8c6c'}
            roughness={0.95}
          />
        </mesh>
      ))}
    </group>
  )
}

export function SheerCurtain({
  width,
  height,
  position,
  rotation,
}: {
  width: number
  height: number
  position: [number, number, number]
  rotation: [number, number, number]
}) {
  const geometry = useMemo(() => {
    const plane = new PlaneGeometry(width, height, 24, 1)
    const positions = plane.attributes.position
    for (let index = 0; index < positions.count; index++) {
      const x = positions.getX(index)
      positions.setZ(index, Math.sin((x / width) * Math.PI * 6) * 0.045)
    }
    plane.computeVertexNormals()
    return plane
  }, [height, width])

  return (
    <mesh geometry={geometry} position={position} rotation={rotation}>
      <meshStandardMaterial
        color="#fdf9f0"
        transparent
        opacity={0.34}
        roughness={0.9}
        side={DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

export function WindowGlow({
  width,
  height,
  position,
  rotation,
  color = '#fff8ea',
}: {
  width: number
  height: number
  position: [number, number, number]
  rotation: [number, number, number]
  color?: string
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial color={color} toneMapped={false} side={DoubleSide} />
    </mesh>
  )
}

export function StudioEnvironment({ tint = '#fff3e2' }: { tint?: string }) {
  return (
    <Environment resolution={128} frames={1}>
      <color attach="background" args={['#efe7d9']} />
      <Lightformer
        intensity={0.9}
        position={[0, 5, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[11, 11, 1]}
        color="#fff8ec"
      />
      <Lightformer
        intensity={1.3}
        position={[6, 2.4, 2]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={[5, 2.6, 1]}
        color={tint}
      />
      <Lightformer
        intensity={0.4}
        position={[-6, 2, -2]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[5, 2.4, 1]}
        color="#e8ecf2"
      />
    </Environment>
  )
}

export function GalleryPictureLight() {
  return (
    <group position={[0, 1.08, 0.13]}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.018, 0.018, 0.72, 12]} />
        <meshStandardMaterial color={BRASS} metalness={0.85} roughness={0.35} />
      </mesh>
      {[-0.33, 0.33].map((x) => (
        <mesh key={x} position={[x, -0.04, -0.02]} rotation={[Math.PI / 3, 0, 0]}>
          <cylinderGeometry args={[0.009, 0.009, 0.13, 8]} />
          <meshStandardMaterial color={BRASS} metalness={0.85} roughness={0.35} />
        </mesh>
      ))}
      <mesh position={[0, -0.03, 0.02]}>
        <boxGeometry args={[0.58, 0.025, 0.018]} />
        <meshBasicMaterial color="#ffe7c4" toneMapped={false} />
      </mesh>
    </group>
  )
}
