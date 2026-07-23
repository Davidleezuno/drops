'use client'

import { ContactShadows, RoundedBox } from '@react-three/drei'
import { useMemo } from 'react'
import { Shape, ShapeGeometry } from 'three'

import type { Product } from '@/lib/types'
import type { Appreciation } from '@/lib/social-events'
import type { Announcement } from '@/lib/use-drop-social'
import type { SceneConfig } from '@/lib/world/scene-config'

import { Awning, CounterClutter, INK, PendantLamp } from './decor'
import { ProductStation } from './product-station'
import {
  BookStack,
  BorderedRug,
  BRASS,
  OAK_DARK,
  PLASTER,
  PottedOlive,
  SheerCurtain,
  StudioEnvironment,
  Vase,
  WindowGlow,
} from './shophouse-decor'
import { StoreSign } from './store-sign'
import { WallTicker } from './wall-ticker'
import { WallOfThanks } from './wall-of-thanks'

const ROOM = { width: 12, depth: 9, height: 3.5 } as const
const DOOR = { x: -3.2, width: 1.5, height: 2.35 } as const
const WINDOW = { width: 3.4, height: 2.05, y: 1.55, z: 0.2 } as const
const PLANKS = ['#d9bfa0', '#cfb493', '#e2c9ac', '#d4ba98'] as const
const FRAME = '#332820'

function archGeometry(width: number, height: number) {
  const radius = width / 2
  const straight = height - radius
  const shape = new Shape()
  shape.moveTo(-radius, 0)
  shape.lineTo(radius, 0)
  shape.lineTo(radius, straight)
  shape.absarc(0, straight, radius, 0, Math.PI, false)
  shape.lineTo(-radius, 0)
  return new ShapeGeometry(shape, 32)
}

function Lighting({
  ambience,
  accent,
  shadows,
}: {
  ambience: SceneConfig['ambience']
  accent: string
  shadows: boolean
}) {
  const settings = {
    warm: { sky: 0.4, sun: 2.65, bounce: 1.15, accent: 0.7 },
    hype: { sky: 0.32, sun: 2.9, bounce: 0.9, accent: 1.15 },
    minimal: { sky: 0.5, sun: 2.35, bounce: 1.3, accent: 0.45 },
  }[ambience]

  return (
    <>
      <StudioEnvironment tint={ambience === 'hype' ? '#eef1ff' : '#fff3e2'} />
      <hemisphereLight args={['#fdf4e6', '#cbb291', settings.sky]} />
      <directionalLight
        position={[9, 6.5, 2.5]}
        intensity={settings.sun}
        color="#ffeed6"
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0004}
      />
      <pointLight
        position={[0, 2.6, -3.2]}
        intensity={settings.bounce}
        color="#ffe4c2"
        distance={7}
      />
      <pointLight
        position={[3.4, 2.1, -3.4]}
        intensity={0.85}
        color="#ffd9a8"
        distance={4}
      />
      <pointLight
        position={[0, 2, -4]}
        intensity={settings.accent}
        color={accent}
        distance={3}
      />
    </>
  )
}

function RoomShell() {
  const arch = useMemo(() => archGeometry(3.65, 3.05), [])
  const archTrim = useMemo(() => archGeometry(3.87, 3.18), [])
  const halfWidth = ROOM.width / 2
  const halfDepth = ROOM.depth / 2

  const doorLeft = DOOR.x - DOOR.width / 2
  const doorRight = DOOR.x + DOOR.width / 2
  const frontSegments = [
    { center: (-halfWidth + doorLeft) / 2, width: doorLeft + halfWidth },
    { center: (doorRight + halfWidth) / 2, width: halfWidth - doorRight },
  ]

  const windowNear = WINDOW.z - WINDOW.width / 2
  const windowFar = WINDOW.z + WINDOW.width / 2
  const rightSegments = [
    { center: (-halfDepth + windowNear) / 2, width: windowNear + halfDepth },
    { center: (windowFar + halfDepth) / 2, width: halfDepth - windowFar },
  ]

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[ROOM.width, ROOM.depth]} />
        <meshStandardMaterial color="#a98f70" roughness={0.98} />
      </mesh>
      {Array.from({ length: 14 }, (_, index) => {
        const depth = ROOM.depth / 14
        return (
          <mesh
            key={index}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.002, -halfDepth + depth / 2 + index * depth]}
            receiveShadow
          >
            <planeGeometry args={[ROOM.width, depth - 0.02]} />
            <meshStandardMaterial color={PLANKS[index % PLANKS.length]} roughness={0.9} />
          </mesh>
        )
      })}

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM.height, 0]}>
        <planeGeometry args={[ROOM.width, ROOM.depth]} />
        <meshStandardMaterial color="#f6f0e4" roughness={0.98} />
      </mesh>
      {[-4.8, -2.4, 0, 2.4, 4.8].map((x) => (
        <mesh key={x} position={[x, ROOM.height - 0.09, 0]} castShadow>
          <boxGeometry args={[0.16, 0.18, ROOM.depth]} />
          <meshStandardMaterial color={OAK_DARK} roughness={0.85} />
        </mesh>
      ))}

      <mesh position={[0, ROOM.height / 2, -halfDepth]} receiveShadow>
        <planeGeometry args={[ROOM.width, ROOM.height]} />
        <meshStandardMaterial color={PLASTER} roughness={0.96} />
      </mesh>
      <mesh
        rotation={[0, Math.PI / 2, 0]}
        position={[-halfWidth, ROOM.height / 2, 0]}
        receiveShadow
      >
        <planeGeometry args={[ROOM.depth, ROOM.height]} />
        <meshStandardMaterial color={PLASTER} roughness={0.96} />
      </mesh>

      {frontSegments.map((segment) => (
        <mesh
          key={segment.center}
          rotation={[0, Math.PI, 0]}
          position={[segment.center, ROOM.height / 2, halfDepth]}
          receiveShadow
        >
          <planeGeometry args={[segment.width, ROOM.height]} />
          <meshStandardMaterial color={PLASTER} roughness={0.96} />
        </mesh>
      ))}
      <mesh
        rotation={[0, Math.PI, 0]}
        position={[DOOR.x, (DOOR.height + ROOM.height) / 2, halfDepth]}
      >
        <planeGeometry args={[DOOR.width, ROOM.height - DOOR.height]} />
        <meshStandardMaterial color={PLASTER} roughness={0.96} />
      </mesh>
      {[-DOOR.width / 2, DOOR.width / 2].map((offset) => (
        <mesh
          key={offset}
          position={[DOOR.x + offset, DOOR.height / 2, halfDepth - 0.03]}
          castShadow
        >
          <boxGeometry args={[0.08, DOOR.height, 0.1]} />
          <meshStandardMaterial color={INK} roughness={0.82} />
        </mesh>
      ))}
      <mesh position={[DOOR.x, DOOR.height + 0.04, halfDepth - 0.03]} castShadow>
        <boxGeometry args={[DOOR.width + 0.24, 0.08, 0.1]} />
        <meshStandardMaterial color={INK} roughness={0.82} />
      </mesh>

      {rightSegments.map((segment) => (
        <mesh
          key={segment.center}
          rotation={[0, -Math.PI / 2, 0]}
          position={[halfWidth, ROOM.height / 2, segment.center]}
          receiveShadow
        >
          <planeGeometry args={[segment.width, ROOM.height]} />
          <meshStandardMaterial color={PLASTER} roughness={0.96} />
        </mesh>
      ))}
      <mesh
        rotation={[0, -Math.PI / 2, 0]}
        position={[
          halfWidth,
          (WINDOW.y + WINDOW.height / 2 + ROOM.height) / 2,
          WINDOW.z,
        ]}
      >
        <planeGeometry args={[WINDOW.width, ROOM.height - WINDOW.y - WINDOW.height / 2]} />
        <meshStandardMaterial color={PLASTER} roughness={0.96} />
      </mesh>
      <mesh
        rotation={[0, -Math.PI / 2, 0]}
        position={[halfWidth, (WINDOW.y - WINDOW.height / 2) / 2, WINDOW.z]}
        receiveShadow
      >
        <planeGeometry args={[WINDOW.width, WINDOW.y - WINDOW.height / 2]} />
        <meshStandardMaterial color={PLASTER} roughness={0.96} />
      </mesh>
      <WindowGlow
        width={WINDOW.width + 0.6}
        height={WINDOW.height + 0.5}
        position={[halfWidth + 0.35, WINDOW.y, WINDOW.z]}
        rotation={[0, -Math.PI / 2, 0]}
      />
      {[-WINDOW.width / 6, WINDOW.width / 6].map((offset) => (
        <mesh key={offset} position={[halfWidth - 0.01, WINDOW.y, WINDOW.z + offset]}>
          <boxGeometry args={[0.06, WINDOW.height, 0.045]} />
          <meshStandardMaterial color={INK} roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[halfWidth - 0.01, WINDOW.y, WINDOW.z]}>
        <boxGeometry args={[0.06, 0.045, WINDOW.width]} />
        <meshStandardMaterial color={INK} roughness={0.8} />
      </mesh>
      {[-WINDOW.width / 2, WINDOW.width / 2].map((offset) => (
        <mesh key={offset} position={[halfWidth - 0.02, WINDOW.y, WINDOW.z + offset]}>
          <boxGeometry args={[0.1, WINDOW.height + 0.1, 0.07]} />
          <meshStandardMaterial color={INK} roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[halfWidth - 0.02, WINDOW.y + WINDOW.height / 2, WINDOW.z]}>
        <boxGeometry args={[0.1, 0.07, WINDOW.width + 0.14]} />
        <meshStandardMaterial color={INK} roughness={0.8} />
      </mesh>
      <mesh
        position={[halfWidth - 0.06, WINDOW.y - WINDOW.height / 2 - 0.025, WINDOW.z]}
        castShadow
      >
        <boxGeometry args={[0.18, 0.05, WINDOW.width + 0.2]} />
        <meshStandardMaterial color={OAK_DARK} roughness={0.85} />
      </mesh>
      <mesh
        position={[halfWidth - 0.28, WINDOW.y + WINDOW.height / 2 + 0.1, WINDOW.z]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.014, 0.014, WINDOW.width + 0.5, 10]} />
        <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.35} />
      </mesh>
      <SheerCurtain
        width={WINDOW.width + 0.3}
        height={WINDOW.height + 0.25}
        position={[halfWidth - 0.3, WINDOW.y - 0.05, WINDOW.z]}
        rotation={[0, -Math.PI / 2, 0]}
      />

      <mesh geometry={archTrim} position={[0, 0.2, -halfDepth + 0.025]}>
        <meshStandardMaterial color={OAK_DARK} roughness={0.85} />
      </mesh>
      <mesh geometry={arch} position={[0, 0.27, -halfDepth + 0.045]} receiveShadow>
        <meshStandardMaterial color="#e0d3bc" roughness={0.97} />
      </mesh>

      {[
        [0, -halfDepth + 0.02, ROOM.width],
        [0, halfDepth - 0.02, ROOM.width],
      ].map(([x, z, width]) => (
        <mesh key={z} position={[x, 0.05, z]}>
          <boxGeometry args={[width, 0.1, 0.035]} />
          <meshStandardMaterial color={OAK_DARK} roughness={0.88} />
        </mesh>
      ))}
      <mesh position={[-halfWidth + 0.02, 0.05, 0]}>
        <boxGeometry args={[0.035, 0.1, ROOM.depth]} />
        <meshStandardMaterial color={OAK_DARK} roughness={0.88} />
      </mesh>
      {[-halfDepth + 0.015, halfDepth - 0.015].map((z) => (
        <mesh key={z} position={[0, ROOM.height - 0.05, z]}>
          <boxGeometry args={[ROOM.width, 0.1, 0.03]} />
          <meshStandardMaterial color="#ece4d4" roughness={0.95} />
        </mesh>
      ))}

      {/* A complete dark-oak structural ring makes the dollhouse boundary
          explicit. The wall planes remain single-sided so the camera can
          look in, while these beams show exactly where the shop begins and
          ends from every approach. */}
      {[-halfDepth + 0.04, halfDepth - 0.04].map((z) => (
        <group key={`cross-${z}`}>
          <mesh position={[0, ROOM.height - 0.11, z]} castShadow>
            <boxGeometry
              args={[
                ROOM.width + 0.2,
                z > 0 ? 0.3 : 0.22,
                z > 0 ? 0.28 : 0.22,
              ]}
            />
            <meshStandardMaterial color={FRAME} roughness={0.86} />
          </mesh>
          <mesh position={[0, 0.09, z]} castShadow>
            <boxGeometry args={[ROOM.width + 0.2, 0.18, 0.2]} />
            <meshStandardMaterial color={FRAME} roughness={0.9} />
          </mesh>
        </group>
      ))}
      {[-halfWidth + 0.04, halfWidth - 0.04].map((x) => (
        <group key={`side-${x}`}>
          <mesh position={[x, ROOM.height - 0.11, 0]} castShadow>
            <boxGeometry args={[0.22, 0.22, ROOM.depth]} />
            <meshStandardMaterial color={FRAME} roughness={0.86} />
          </mesh>
          <mesh position={[x, 0.09, 0]} castShadow>
            <boxGeometry args={[0.2, 0.18, ROOM.depth]} />
            <meshStandardMaterial color={FRAME} roughness={0.9} />
          </mesh>
        </group>
      ))}
      {[-halfWidth + 0.04, halfWidth - 0.04].flatMap((x) =>
        [-halfDepth + 0.04, halfDepth - 0.04].map((z) => (
          <mesh key={`post-${x}-${z}`} position={[x, ROOM.height / 2, z]} castShadow>
            <boxGeometry args={[0.24, ROOM.height, 0.24]} />
            <meshStandardMaterial color={FRAME} roughness={0.86} />
          </mesh>
        )),
      )}
    </>
  )
}

type StationPlacement = {
  position: [number, number, number]
  rotation: [number, number, number]
}

const STATION_PLACEMENTS: Record<
  SceneConfig['stations'][number]['zone'],
  StationPlacement
> = {
  // Each surface faces the room, with the central rug left as circulation.
  // Back-left deliberately stops short of the hanging store sign.
  'back-left': { position: [-3.85, 0, -3.82], rotation: [0, 0, 0] },
  window: { position: [5.28, 0, 0.18], rotation: [0, -Math.PI / 2, 0] },
  'left-wall': { position: [-5.28, 0, 0.85], rotation: [0, Math.PI / 2, 0] },
  'front-right': { position: [2.55, 0, 3.82], rotation: [0, Math.PI, 0] },
}

function ShopDecor({ accent }: { accent: string }) {
  const halfDepth = ROOM.depth / 2

  return (
    <>
      <Awning
        position={[DOOR.x, 2.5, halfDepth - 0.05]}
        accent={accent}
        width={2.6}
      />
      <BorderedRug
        width={4.8}
        depth={3.2}
        color="#e7dcc6"
        border="#b5764f"
        position={[0.3, 0.012, 0.7]}
      />

      <group position={[3.5, 0, -3.55]}>
        <RoundedBox
          args={[2.7, 0.92, 0.72]}
          radius={0.03}
          smoothness={3}
          position={[0, 0.46, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color="#f4eee1" roughness={0.92} />
        </RoundedBox>
        {Array.from({ length: 16 }, (_, index) => (
          <mesh key={index} position={[-1.26 + index * 0.168, 0.46, 0.37]}>
            <cylinderGeometry
              args={[0.035, 0.035, 0.86, 10, 1, false, -Math.PI / 2, Math.PI]}
            />
            <meshStandardMaterial color="#c8a273" roughness={0.85} />
          </mesh>
        ))}
        <mesh position={[0, 0.95, 0]} castShadow>
          <boxGeometry args={[2.82, 0.06, 0.84]} />
          <meshStandardMaterial color="#ddd0ba" roughness={0.65} />
        </mesh>
        <BookStack position={[-0.9, 0.98, 0.05]} count={3} rotation={0.2} />
        <Vase position={[-0.45, 0.98, -0.1]} scale={0.9} />
        <CounterClutter position={[0.85, 0.98, -0.05]} />
      </group>
      <PendantLamp position={[2.7, ROOM.height, -3.55]} drop={0.95} />
      <PendantLamp position={[4.3, ROOM.height, -3.55]} drop={0.95} />

      <PottedOlive position={[1.8, 0, -4.05]} scale={0.92} />
      <PottedOlive position={[5.25, 0, 3.85]} scale={0.72} />
      <Vase position={[-5.5, 0, 4]} scale={1.5} color="#d9cfc0" stem={false} />
      <BookStack position={[4.9, 0, -4]} count={4} rotation={-0.4} />

      {/* Half-packed stock keeps the room feeling actively worked in. */}
      <group position={[-5.35, 0, 3.72]} rotation={[0, 0.22, 0]}>
        <mesh position={[0, 0.25, 0]} castShadow>
          <boxGeometry args={[0.78, 0.5, 0.62]} />
          <meshStandardMaterial color="#a77a4f" roughness={1} />
        </mesh>
        <mesh position={[0.28, 0.66, -0.05]} rotation={[0, -0.18, 0]} castShadow>
          <boxGeometry args={[0.58, 0.34, 0.5]} />
          <meshStandardMaterial color="#b78b5d" roughness={1} />
        </mesh>
      </group>
    </>
  )
}

export function StoreTemplate({
  config,
  products,
  accent,
  windowClosed,
  announcement,
  appreciations,
  shadows,
  onSelectProduct,
}: {
  config: SceneConfig
  products: Product[]
  accent: string
  windowClosed: boolean
  announcement: Announcement | null
  appreciations: Appreciation[]
  shadows: boolean
  onSelectProduct: (product: Product) => void
}) {
  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  )

  return (
    <>
      <color attach="background" args={['#e9e0cf']} />
      <fog attach="fog" args={['#e9e0cf', 18, 34]} />
      <Lighting ambience={config.ambience} accent={accent} shadows={shadows} />
      <RoomShell />
      <ShopDecor accent={accent} />

      <StoreSign
        config={config}
        accent={accent}
        closed={windowClosed}
        position={[0, 2.22, -4.34]}
        scale={0.72}
      />
      <WallTicker announcement={announcement} position={[0, 1.18, -4.29]} />
      <WallOfThanks
        key={appreciations[0]?.id ?? 'empty-wall'}
        appreciations={appreciations}
        accent={accent}
      />

      {config.stations.map((station) => {
        const placement = STATION_PLACEMENTS[station.zone]

        return (
          <group
            key={station.id}
            position={placement.position}
            rotation={placement.rotation}
          >
            <ProductStation
              station={station}
              productsById={productsById}
              accent={accent}
              disabled={windowClosed}
              announcement={announcement}
              onSelect={onSelectProduct}
            />
          </group>
        )
      })}

      {shadows && (
        <ContactShadows
          position={[0, 0.015, 0]}
          opacity={0.32}
          scale={14}
          blur={2.2}
          far={4.5}
          frames={1}
        />
      )}
    </>
  )
}
