'use client'

import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef, type RefObject } from 'react'
import type { Group } from 'three'

import { REACTION_EMOJI, type ReactionEmoji } from '@/lib/social-events'
import type { RemoteShopper, WorldPose } from '@/lib/use-world-presence'

export type AvatarReaction = { id: number; emoji: ReactionEmoji }

export function Avatar({
  name,
  tint,
  reaction,
  local = false,
}: {
  name: string
  tint: string
  reaction?: AvatarReaction
  local?: boolean
}) {
  return (
    <group>
      <mesh position={[0, 0.52, 0]} castShadow>
        <capsuleGeometry args={[0.23, 0.38, 8, 14]} />
        <meshStandardMaterial color={tint} roughness={0.92} />
      </mesh>
      <mesh position={[-0.08, 0.63, -0.22]} scale={[0.72, 1.15, 0.55]}>
        <sphereGeometry args={[0.026, 10, 8]} />
        <meshBasicMaterial color="#2d2925" />
      </mesh>
      <mesh position={[0.08, 0.63, -0.22]} scale={[0.72, 1.15, 0.55]}>
        <sphereGeometry args={[0.026, 10, 8]} />
        <meshBasicMaterial color="#2d2925" />
      </mesh>
      <mesh position={[0, 0.56, -0.232]} scale={[1.6, 0.45, 0.55]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.04, 0.009, 6, 12, Math.PI]} />
        <meshBasicMaterial color="#2d2925" />
      </mesh>

      <Html center position={[0, 1.08, 0]} distanceFactor={4}>
        <span className="pointer-events-none block whitespace-nowrap rounded-full border border-black/10 bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-[#2d2925] shadow-sm">
          {local ? `${name} · you` : name}
        </span>
      </Html>

      {reaction && (
        <Html key={reaction.id} center position={[0, 1.55, 0]} distanceFactor={4}>
          <span className="world-reaction-pop pointer-events-none block text-3xl">
            {REACTION_EMOJI[reaction.emoji]}
          </span>
        </Html>
      )}
    </group>
  )
}

const TWO_PI = Math.PI * 2

function shortestAngle(from: number, to: number) {
  return ((to - from + Math.PI) % TWO_PI + TWO_PI) % TWO_PI - Math.PI
}

export function RemoteAvatar({
  shopper,
  poses,
  reaction,
}: {
  shopper: RemoteShopper
  poses: RefObject<Map<string, WorldPose>>
  reaction?: AvatarReaction
}) {
  const group = useRef<Group>(null)
  const snapped = useRef(false)

  useFrame((_, delta) => {
    const target = poses.current?.get(shopper.key)
    if (!group.current || !target) return
    if (!snapped.current) {
      snapped.current = true
      group.current.position.set(target.x, 0, target.z)
      group.current.rotation.y = target.ry
      return
    }
    const alpha = 1 - Math.exp(-delta * 10)
    group.current.position.x += (target.x - group.current.position.x) * alpha
    group.current.position.z += (target.z - group.current.position.z) * alpha
    group.current.rotation.y +=
      shortestAngle(group.current.rotation.y, target.ry) * alpha
  })

  return (
    <group ref={group}>
      <Avatar name={shopper.name} tint={shopper.tint} reaction={reaction} />
    </group>
  )
}
