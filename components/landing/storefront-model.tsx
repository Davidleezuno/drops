'use client'

import { ContactShadows, Text, useGLTF } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import {
  CatmullRomCurve3,
  Group,
  MathUtils,
  Mesh,
  OrthographicCamera,
  Vector3,
} from 'three'

const MODEL_URL = '/hero/storefront/virtual-world-storefront.glb'

type Point = [number, number, number]

function CameraRig() {
  const { camera, size } = useThree()

  useEffect(() => {
    const ortho = camera as OrthographicCamera
    ortho.position.set(0, 3.45, 14)
    ortho.lookAt(0, 2.75, 0)
    ortho.zoom = Math.min(size.width / 11.35, size.height / 6.9)
    ortho.updateProjectionMatrix()
  }, [camera, size.height, size.width])

  return null
}

function BlobShopper({
  color,
  path,
  speed,
  phase,
  scale = 1,
}: {
  color: string
  path: Point[]
  speed: number
  phase: number
  scale?: number
}) {
  const group = useRef<Group>(null)
  const curve = useMemo(
    () => new CatmullRomCurve3(path.map((point) => new Vector3(...point)), true, 'catmullrom', 0.35),
    [path],
  )

  useFrame(({ clock }) => {
    if (!group.current) return
    const time = clock.elapsedTime
    const progress = (time * speed + phase) % 1
    const point = curve.getPointAt(progress)
    const tangent = curve.getTangentAt(progress)
    group.current.position.copy(point)
    group.current.position.y += Math.abs(Math.sin((time + phase * 5) * 7.5)) * 0.055
    group.current.rotation.y = Math.atan2(tangent.x, tangent.z)
  })

  return (
    <group ref={group} scale={scale}>
      <mesh castShadow position={[0, 0.42, 0]}>
        <capsuleGeometry args={[0.22, 0.42, 7, 12]} />
        <meshStandardMaterial color={color} roughness={0.82} />
      </mesh>
      <mesh position={[-0.075, 0.53, 0.215]} scale={[0.75, 1.1, 0.55]}>
        <sphereGeometry args={[0.027, 8, 8]} />
        <meshBasicMaterial color="#332820" />
      </mesh>
      <mesh position={[0.075, 0.53, 0.215]} scale={[0.75, 1.1, 0.55]}>
        <sphereGeometry args={[0.027, 8, 8]} />
        <meshBasicMaterial color="#332820" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
        <circleGeometry args={[0.3, 18]} />
        <meshBasicMaterial color="#3d2d20" transparent opacity={0.13} depthWrite={false} />
      </mesh>
    </group>
  )
}

function QueueShopper({
  color,
  position,
  phase,
  scale = 1.15,
}: {
  color: string
  position: Point
  phase: number
  scale?: number
}) {
  const group = useRef<Group>(null)

  useFrame(({ clock }, delta) => {
    if (!group.current) return
    const time = clock.elapsedTime + phase
    const targetY = position[1] + Math.abs(Math.sin(time * 4.8)) * 0.035
    group.current.position.y = MathUtils.damp(group.current.position.y, targetY, 7, delta)
    group.current.rotation.y = Math.sin(time * 0.7) * 0.08
  })

  return (
    <group ref={group} position={position} scale={scale}>
      <mesh castShadow position={[0, 0.4, 0]}>
        <capsuleGeometry args={[0.21, 0.4, 7, 12]} />
        <meshStandardMaterial color={color} roughness={0.84} />
      </mesh>
      <mesh position={[-0.07, 0.51, 0.205]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshBasicMaterial color="#332820" />
      </mesh>
      <mesh position={[0.07, 0.51, 0.205]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshBasicMaterial color="#332820" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
        <circleGeometry args={[0.28, 18]} />
        <meshBasicMaterial color="#3d2d20" transparent opacity={0.13} depthWrite={false} />
      </mesh>
    </group>
  )
}

function StorefrontModel({ onReady }: { onReady: () => void }) {
  const rig = useRef<Group>(null)
  const gltf = useGLTF(MODEL_URL)

  useEffect(() => {
    gltf.scene.traverse((child) => {
      if (child instanceof Mesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    onReady()
  }, [gltf.scene, onReady])

  useFrame(({ clock, pointer }, delta) => {
    if (!rig.current) return
    rig.current.rotation.y = MathUtils.damp(rig.current.rotation.y, pointer.x * 0.035, 3.2, delta)
    rig.current.rotation.x = MathUtils.damp(rig.current.rotation.x, -pointer.y * 0.012, 3.2, delta)
    rig.current.position.y = Math.sin(clock.elapsedTime * 0.55) * 0.025
  })

  return (
    <group ref={rig} position={[0, -0.12, 0]}>
      <primitive object={gltf.scene} />

      <Text
        position={[0, 4.33, 2.93]}
        font="/fonts/bricolage-grotesque-600.woff"
        fontSize={0.29}
        maxWidth={3}
        textAlign="center"
        anchorX="center"
        anchorY="middle"
        color="#332820"
      >
        Tonight&apos;s Roti Supper
      </Text>
      <Text
        position={[0, 4.02, 2.94]}
        font="/fonts/geist-mono-500.woff"
        fontSize={0.095}
        letterSpacing={0.08}
        anchorX="center"
        anchorY="middle"
        color="#9a5734"
      >
        BY ROTI WIFE · OPEN NOW
      </Text>

      <BlobShopper
        color="#ee9eb0"
        speed={0.038}
        phase={0.08}
        path={[
          [-2.9, 0.34, 1.35],
          [-2.25, 0.34, -0.8],
          [-0.9, 0.34, -1.25],
          [-1.2, 0.34, 1.05],
        ]}
      />
      <BlobShopper
        color="#95accb"
        speed={0.034}
        phase={0.58}
        scale={1.08}
        path={[
          [2.8, 0.34, 1.2],
          [2.45, 0.34, -0.95],
          [0.85, 0.34, -0.55],
          [1.3, 0.34, 1.15],
        ]}
      />

      <QueueShopper color="#a9ba78" position={[-0.92, 0.34, 3.58]} phase={0.4} scale={1.28} />
      <QueueShopper color="#e1a06b" position={[-1.55, 0.34, 3.72]} phase={1.6} scale={1.23} />
      <QueueShopper color="#b69bcf" position={[-2.18, 0.34, 3.86]} phase={2.8} scale={1.18} />
    </group>
  )
}

export function StorefrontCanvas({ onReady }: { onReady: () => void }) {
  return (
    <Canvas
      orthographic
      shadows
      dpr={[1, 1.6]}
      camera={{ position: [0, 3.45, 14], zoom: 70, near: 0.1, far: 50 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.setClearColor('#eee8dc', 0)
        gl.toneMappingExposure = 1.02
      }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.85} color="#fff8eb" />
        <hemisphereLight args={['#fff7e8', '#c7af8c', 1.05]} />
        <directionalLight
          castShadow
          position={[7, 10, 9]}
          intensity={2.4}
          color="#fff0d8"
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-7}
          shadow-camera-right={7}
          shadow-camera-top={7}
          shadow-camera-bottom={-3}
          shadow-bias={-0.00035}
        />
        <pointLight position={[0, 4, 4]} intensity={1.4} distance={12} color="#ffb16f" />
        <StorefrontModel onReady={onReady} />
        <ContactShadows
          position={[0, 0.12, 0]}
          opacity={0.2}
          scale={14}
          blur={2.8}
          far={7}
          color="#5e422d"
        />
        <CameraRig />
      </Suspense>
    </Canvas>
  )
}

useGLTF.preload(MODEL_URL)
