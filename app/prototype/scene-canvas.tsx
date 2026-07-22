'use client'

/** PROTOTYPE — throwaway. The R3F canvas for /prototype; loaded ssr:false. */

import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'

import type { VariantMeta } from './data'
import { ConservatoryScene } from './variants/conservatory'
import {
  DomesticCircuitScene,
  DomesticLoopScene,
  FrontRoomScene,
} from './variants/front-room'
import { ShophouseScene } from './variants/shophouse'

const SCENES = {
  'domestic-circuit': DomesticCircuitScene,
  'domestic-loop': DomesticLoopScene,
  shophouse: ShophouseScene,
  'front-room': FrontRoomScene,
  conservatory: ConservatoryScene,
} as const

export default function SceneCanvas({ variant }: { variant: VariantMeta }) {
  const Scene = SCENES[variant.key as keyof typeof SCENES] ?? ShophouseScene
  return (
    <Canvas
      key={variant.key}
      shadows
      dpr={[1, 1.75]}
      camera={{ position: variant.camera.position, fov: 40, near: 0.1, far: 80 }}
      gl={{ antialias: true }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 0.95
      }}
    >
      <Suspense fallback={null}>
        <Scene seller={variant.seller} />
        <OrbitControls
          makeDefault
          target={variant.camera.target}
          enableDamping
          dampingFactor={0.06}
          autoRotate
          autoRotateSpeed={0.45}
          enablePan={false}
          minDistance={2.2}
          maxDistance={7.5}
          minPolarAngle={0.6}
          maxPolarAngle={1.53}
        />
      </Suspense>
    </Canvas>
  )
}
