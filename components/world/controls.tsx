'use client'

import { useFrame, useThree } from '@react-three/fiber'
import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { Group } from 'three'
import { Vector3 } from 'three'

import type { WorldPose } from '@/lib/use-world-presence'

import { Avatar, type AvatarReaction } from './avatar'

export type WorldInput = {
  movement: () => { forward: number; right: number }
  setMovement: (forward: number, right: number) => void
  addLook: (delta: number) => void
  consumeLook: () => number
}

export function createWorldInput(): WorldInput {
  let forward = 0
  let right = 0
  let lookDelta = 0

  return {
    movement: () => ({ forward, right }),
    setMovement: (nextForward, nextRight) => {
      forward = nextForward
      right = nextRight
    },
    addLook: (delta) => {
      lookDelta += delta
    },
    consumeLook: () => {
      const consumed = lookDelta
      lookDelta = 0
      return consumed
    },
  }
}

export function PlayerControls({
  input,
  name,
  tint,
  reaction,
  enabled,
  entering,
  onPose,
}: {
  input: WorldInput
  name: string
  tint: string
  reaction?: AvatarReaction
  enabled: boolean
  entering: boolean
  onPose: (pose: WorldPose) => void
}) {
  const group = useRef<Group>(null)
  // Enter through the shophouse doorway already turned a little toward the
  // gallery wall. On a phone's narrow field of view this reveals merchandise
  // immediately without promoting one product into a central hero.
  const yaw = useRef(-0.5)
  const keys = useRef(new Set<string>())
  const velocity = useRef(new Vector3())
  const entranceElapsed = useRef(0)
  const { camera, gl } = useThree()

  useEffect(() => {
    if (entering) entranceElapsed.current = 0
  }, [entering])

  useEffect(() => {
    const canvas = gl.domElement
    let dragging = false
    let pointerId: number | null = null
    let lastClientX = 0

    const down = (event: PointerEvent) => {
      if (!enabled || entering) return
      dragging = true
      pointerId = event.pointerId
      lastClientX = event.clientX
      canvas.setPointerCapture?.(event.pointerId)
    }
    const move = (event: PointerEvent) => {
      if (!dragging || event.pointerId !== pointerId) return
      const delta = event.movementX || event.clientX - lastClientX
      lastClientX = event.clientX
      input.addLook(delta)
    }
    const up = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return
      dragging = false
      pointerId = null
    }
    const keyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        !enabled ||
        entering ||
        target?.isContentEditable ||
        (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      ) {
        return
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault()
      }
      keys.current.add(event.key.toLowerCase())
    }
    const keyUp = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase())

    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', up)
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    return () => {
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', up)
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
    }
  }, [enabled, entering, gl, input])

  useEffect(() => {
    if (enabled && !entering) return
    keys.current.clear()
    input.setMovement(0, 0)
  }, [enabled, entering, input])

  useFrame((_, delta) => {
    const player = group.current
    if (!player) return

    const interactive = enabled && !entering
    if (interactive) yaw.current -= input.consumeLook() * 0.004

    const pressed = keys.current
    const movement = input.movement()
    const forward = interactive
      ? movement.forward +
        (pressed.has('w') || pressed.has('arrowup') ? 1 : 0) -
        (pressed.has('s') || pressed.has('arrowdown') ? 1 : 0)
      : 0
    const right = interactive
      ? movement.right +
        (pressed.has('d') || pressed.has('arrowright') ? 1 : 0) -
        (pressed.has('a') || pressed.has('arrowleft') ? 1 : 0)
      : 0

    velocity.current.set(
      Math.sin(yaw.current) * forward + Math.cos(yaw.current) * right,
      0,
      -Math.cos(yaw.current) * forward + Math.sin(yaw.current) * right,
    )
    if (velocity.current.lengthSq() > 1) velocity.current.normalize()
    velocity.current.multiplyScalar(delta * 3.2)

    if (interactive) {
      player.position.x = Math.max(
        -5.75,
        Math.min(5.75, player.position.x + velocity.current.x),
      )
      player.position.z = Math.max(
        -3.55,
        Math.min(4.15, player.position.z + velocity.current.z),
      )
    }
    player.rotation.y = yaw.current
    player.rotation.z +=
      ((right === 0 ? 0 : -Math.sign(right) * 0.05) - player.rotation.z) *
      Math.min(1, delta * 10)

    const cameraTarget = new Vector3(
      player.position.x - Math.sin(yaw.current) * 4.4,
      2.3,
      player.position.z + Math.cos(yaw.current) * 4.4,
    )
    if (entering) {
      entranceElapsed.current += delta
      const progress = Math.min(1, entranceElapsed.current / 1.05)
      const eased = 1 - Math.pow(1 - progress, 4)
      const doorway = new Vector3(
        cameraTarget.x - 0.2,
        cameraTarget.y + 0.4,
        cameraTarget.z + 3.2,
      )
      camera.position.lerpVectors(doorway, cameraTarget, eased)
    } else {
      camera.position.lerp(cameraTarget, 1 - Math.exp(-delta * 8))
    }
    camera.lookAt(player.position.x, 0.72, player.position.z)
    onPose({ x: player.position.x, z: player.position.z, ry: yaw.current })
  })

  return (
    <group ref={group} position={[-3.2, 0, 3.7]}>
      <Avatar name={name} tint={tint} reaction={reaction} local />
    </group>
  )
}

export function MobileJoystick({
  input,
}: {
  input: WorldInput
}) {
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const origin = useRef({ x: 0, y: 0 })
  const pointer = useRef<number | null>(null)
  const radius = 42

  function move(event: ReactPointerEvent<HTMLDivElement>) {
    if (pointer.current !== event.pointerId) return
    const dx = event.clientX - origin.current.x
    const dy = event.clientY - origin.current.y
    const length = Math.hypot(dx, dy)
    const scale = length > radius ? radius / length : 1
    const x = dx * scale
    const y = dy * scale
    setKnob({ x, y })
    input.setMovement(-y / radius, x / radius)
  }

  function reset() {
    pointer.current = null
    setKnob({ x: 0, y: 0 })
    input.setMovement(0, 0)
  }

  return (
    <div
      aria-label="Movement joystick"
      className="absolute bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] left-5 z-20 flex size-28 touch-none items-center justify-center rounded-full border border-white/30 bg-black/20 backdrop-blur-sm md:hidden"
      onPointerDown={(event) => {
        pointer.current = event.pointerId
        const bounds = event.currentTarget.getBoundingClientRect()
        origin.current = { x: bounds.left + 56, y: bounds.top + 56 }
        event.currentTarget.setPointerCapture(event.pointerId)
        move(event)
      }}
      onPointerMove={move}
      onPointerUp={reset}
      onPointerCancel={reset}
    >
      <div
        className="size-12 rounded-full border border-white/50 bg-white/80 shadow-lg"
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
      />
    </div>
  )
}
