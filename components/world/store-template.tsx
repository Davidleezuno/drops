'use client'

import { ContactShadows, Html, RoundedBox } from '@react-three/drei'
import { useMemo } from 'react'

import type { Product } from '@/lib/types'
import type { Announcement } from '@/lib/use-drop-social'
import type { SceneConfig } from '@/lib/world/scene-config'

import {
  Awning,
  CounterClutter,
  INK,
  PendantLamp,
  Plant,
  RoundedRect,
  StringLights,
  WallArt,
} from './decor'
import { ProductFrame } from './product-frame'
import { StoreSign } from './store-sign'
import { WallTicker } from './wall-ticker'

const WALL = '#f7f1e6'
// Warm oak plank tones; the darker base plane shows through as gap lines.
const FLOOR_BASE = '#c6b291'
const PLANK_TONES = ['#e0cfb6', '#d8c4a7', '#dcc9ae'] as const
const ROOM = { width: 14, depth: 10, height: 3.2 } as const
const DOOR = { width: 2.4, height: 2.45 } as const

function Lighting({ ambience, accent }: { ambience: SceneConfig['ambience']; accent: string }) {
  const settings = {
    warm: { ambient: 1.25, key: 2.1, fill: 1.35, keyColor: '#ffe8c9' },
    hype: { ambient: 0.95, key: 2.5, fill: 0.75, keyColor: '#edf4ff' },
    minimal: { ambient: 1.5, key: 1.7, fill: 1.45, keyColor: '#fffdf7' },
  }[ambience]

  return (
    <>
      {/* Sky tone kept warm: a cool-blue hemisphere turns the side walls
          (which face away from the key light) sterile gray. */}
      <hemisphereLight args={['#f3ead9', '#d9b98c', settings.ambient]} />
      <directionalLight
        position={[4.5, 7, 4]}
        intensity={settings.key}
        color={settings.keyColor}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-4, 2.7, 0]} intensity={settings.fill} color="#fff4e6" />
      <pointLight
        position={[0, 2.5, -3.8]}
        intensity={ambience === 'hype' ? 4.5 : 2.5}
        color={accent}
        distance={5}
      />
      {/* Soft daylight spilling in from the doorway. */}
      <pointLight position={[0, 1.9, 4.6]} intensity={1.1} color="#fff6e4" distance={6} />
    </>
  )
}

/**
 * Room shell. Walls and ceiling are single-sided planes facing inward, so
 * the follow-camera can sit outside any surface (entrance especially) and
 * still see the whole store — the dollhouse trick — while from inside the
 * room reads fully enclosed.
 */
function RoomShell() {
  const halfW = ROOM.width / 2
  const halfD = ROOM.depth / 2
  const doorSideWidth = (ROOM.width - DOOR.width) / 2
  const doorSideX = DOOR.width / 2 + doorSideWidth / 2
  const headerHeight = ROOM.height - DOOR.height

  return (
    <>
      {/* Wood plank floor: strips over a darker base that reads as gap lines */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM.width, ROOM.depth]} />
        <meshStandardMaterial color={FLOOR_BASE} roughness={0.98} />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => {
        const plankDepth = ROOM.depth / 9
        const z = -halfD + plankDepth / 2 + i * plankDepth
        return (
          <mesh
            key={i}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.005, z]}
            receiveShadow
          >
            <planeGeometry args={[ROOM.width, plankDepth - 0.03]} />
            <meshStandardMaterial color={PLANK_TONES[i % 3]} roughness={0.96} />
          </mesh>
        )
      })}

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM.height, 0]}>
        <planeGeometry args={[ROOM.width, ROOM.depth]} />
        {/* Downward-facing plane gets almost no light — lift it so the
            ceiling reads warm white instead of shadowed brown. */}
        <meshStandardMaterial
          color="#faf5ea"
          roughness={0.98}
          emissive="#f2e9d9"
          emissiveIntensity={0.62}
        />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, ROOM.height / 2, -halfD]} receiveShadow>
        <planeGeometry args={[ROOM.width, ROOM.height]} />
        <meshStandardMaterial color={WALL} roughness={0.96} />
      </mesh>
      {/* Side walls */}
      <mesh
        rotation={[0, Math.PI / 2, 0]}
        position={[-halfW, ROOM.height / 2, 0]}
        receiveShadow
      >
        <planeGeometry args={[ROOM.depth, ROOM.height]} />
        <meshStandardMaterial color={WALL} roughness={0.96} />
      </mesh>
      <mesh
        rotation={[0, -Math.PI / 2, 0]}
        position={[halfW, ROOM.height / 2, 0]}
        receiveShadow
      >
        <planeGeometry args={[ROOM.depth, ROOM.height]} />
        <meshStandardMaterial color={WALL} roughness={0.96} />
      </mesh>
      {/* Front wall: two panels + header over the doorway */}
      {[-doorSideX, doorSideX].map((x) => (
        <mesh key={x} rotation={[0, Math.PI, 0]} position={[x, ROOM.height / 2, halfD]}>
          <planeGeometry args={[doorSideWidth, ROOM.height]} />
          <meshStandardMaterial color={WALL} roughness={0.96} />
        </mesh>
      ))}
      <mesh
        rotation={[0, Math.PI, 0]}
        position={[0, DOOR.height + headerHeight / 2, halfD]}
      >
        <planeGeometry args={[DOOR.width, headerHeight]} />
        <meshStandardMaterial color={WALL} roughness={0.96} />
      </mesh>

      {/* Ink door trim — posts and lintel around the opening */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * (DOOR.width / 2 + 0.04), DOOR.height / 2, halfD - 0.02]}
          castShadow
        >
          <boxGeometry args={[0.09, DOOR.height, 0.12]} />
          <meshStandardMaterial color={INK} roughness={0.82} />
        </mesh>
      ))}
      <mesh position={[0, DOOR.height + 0.045, halfD - 0.02]} castShadow>
        <boxGeometry args={[DOOR.width + 0.26, 0.09, 0.12]} />
        <meshStandardMaterial color={INK} roughness={0.82} />
      </mesh>

      {/* Ink baseboards ground the walls */}
      <mesh position={[0, 0.045, -halfD + 0.015]}>
        <boxGeometry args={[ROOM.width, 0.09, 0.03]} />
        <meshStandardMaterial color={INK} roughness={0.9} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (halfW - 0.015), 0.045, 0]}>
          <boxGeometry args={[0.03, 0.09, ROOM.depth]} />
          <meshStandardMaterial color={INK} roughness={0.9} />
        </mesh>
      ))}
      {[-doorSideX, doorSideX].map((x) => (
        <mesh key={x} position={[x, 0.045, halfD - 0.015]}>
          <boxGeometry args={[doorSideWidth, 0.09, 0.03]} />
          <meshStandardMaterial color={INK} roughness={0.9} />
        </mesh>
      ))}

      {/* Ceiling track lighting above each shelf wall */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 5.55, ROOM.height - 0.07, 0]}>
          <boxGeometry args={[0.1, 0.05, 8.6]} />
          <meshStandardMaterial color={INK} roughness={0.85} />
        </mesh>
      ))}
    </>
  )
}

/**
 * Warmth without clutter: a few still props, scaled back as the ambience
 * gets more energetic — the home-bakery default reads cosiest, `minimal`
 * stays nearly bare gallery.
 */
function Decor({ ambience, accent }: { ambience: SceneConfig['ambience']; accent: string }) {
  const halfD = ROOM.depth / 2
  const cosy = ambience === 'warm'
  const sparse = ambience === 'minimal'

  return (
    <>
      {/* Scalloped awning over the doorway — the welcome gesture */}
      <Awning position={[0, 2.62, halfD - 0.04]} accent={accent} />

      {/* Visible light sources: string bulbs + pendants flanking the counter.
          `minimal` keeps the bare gallery ceiling. */}
      {!sparse && (
        <>
          <StringLights from={[-6.85, 3.05, -1.4]} to={[6.85, 3.05, -1.4]} />
          <StringLights from={[-6.85, 3.05, 1.9]} to={[6.85, 3.05, 1.9]} />
          <PendantLamp position={[-2.9, 3.2, -4.05]} />
          <PendantLamp position={[2.9, 3.2, -4.05]} />
        </>
      )}

      {/* Entrance mat — the one accent-colored surface on the floor */}
      <RoundedRect
        width={2.1}
        depth={1.15}
        radius={0.18}
        color={accent}
        opacity={0.28}
        position={[0, 0.012, halfD - 0.85]}
      />

      {!sparse && (
        <RoundedRect
          width={4.6}
          depth={3.1}
          radius={0.5}
          color={cosy ? '#d2c0a4' : '#c9b89e'}
          position={[0, 0.011, 0.1]}
        />
      )}

      <Plant position={[-6.2, 0, -4.3]} scale={1.05} tall />
      {!sparse && <Plant position={[6.25, 0, -4.35]} tall />}
      {cosy && (
        <>
          <Plant position={[-1.85, 0, 4.35]} scale={0.9} />
          <Plant position={[1.85, 0, 4.4]} scale={0.8} />
        </>
      )}
      {/* Small plant + clutter live on the counter top (y ≈ 0.96) */}
      {!sparse && <Plant position={[-2.15, 0.96, -4.2]} scale={0.62} />}
      <CounterClutter position={[1.75, 0.96, -4.15]} />

      {/* Quiet prints flanking the doorway, facing into the room */}
      <WallArt
        position={[-3.4, 1.55, halfD - 0.06]}
        rotation={[0, Math.PI, 0]}
        variant="arch"
      />
      {!sparse && (
        <WallArt
          position={[3.4, 1.55, halfD - 0.06]}
          rotation={[0, Math.PI, 0]}
          variant="sun"
        />
      )}
    </>
  )
}

function slotPosition(index: number) {
  const left = index % 2 === 0
  const row = Math.floor(index / 2)
  return {
    position: [left ? -6.62 : 6.62, 1.72, 2.15 - row * 1.18] as [
      number,
      number,
      number,
    ],
    rotation: [0, left ? Math.PI / 2 : -Math.PI / 2, 0] as [
      number,
      number,
      number,
    ],
  }
}

export function StoreTemplate({
  config,
  products,
  accent,
  windowClosed,
  announcement,
  shadows,
  onSelectProduct,
}: {
  config: SceneConfig
  products: Product[]
  accent: string
  windowClosed: boolean
  announcement: Announcement | null
  shadows: boolean
  onSelectProduct: (product: Product) => void
}) {
  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  )
  const hero = config.slots.find((slot) => slot.kind === 'plinth')
  const shelfSlots = config.slots.filter((slot) => slot.kind === 'shelf')

  return (
    <>
      <color attach="background" args={['#eee9e1']} />
      <fog attach="fog" args={['#eee9e1', 13, 23]} />
      <Lighting ambience={config.ambience} accent={accent} />

      <RoomShell />
      <Decor ambience={config.ambience} accent={accent} />

      {/* Quiet accent trim mounted flush on the walls — floating it off the
          surface reads as a glitch from oblique angles. */}
      <mesh position={[-6.97, 0.42, 0]}>
        <boxGeometry args={[0.035, 0.035, 8.6]} />
        <meshBasicMaterial color={accent} transparent opacity={0.7} />
      </mesh>
      <mesh position={[6.97, 0.42, 0]}>
        <boxGeometry args={[0.035, 0.035, 8.6]} />
        <meshBasicMaterial color={accent} transparent opacity={0.7} />
      </mesh>

      <RoundedBox args={[5.4, 0.95, 0.9]} radius={0.12} smoothness={3} position={[0, 0.48, -4.2]} castShadow>
        <meshStandardMaterial color="#fffdf8" roughness={0.9} />
      </RoundedBox>
      <mesh position={[0, 0.93, -4.18]}>
        <boxGeometry args={[5.45, 0.06, 0.94]} />
        <meshStandardMaterial color={INK} roughness={0.82} />
      </mesh>
      <StoreSign config={config} accent={accent} closed={windowClosed} />
      <WallTicker
        announcement={announcement}
      />

      {hero && productsById.get(hero.productId) && (
        <group>
          <RoundedBox args={[2.1, 0.68, 1.25]} radius={0.12} smoothness={3} position={[0, 0.34, 1.65]} castShadow receiveShadow>
            <meshStandardMaterial color="#fffdf8" roughness={0.92} />
          </RoundedBox>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 1.65]}>
            <circleGeometry args={[1.15, 32]} />
            <meshBasicMaterial color={accent} transparent opacity={0.18} />
          </mesh>
          <group position={[0, 1.52, 1.62]}>
            <ProductFrame
              product={productsById.get(hero.productId)!}
              imageUrl={hero.imageUrl}
              accent={accent}
              disabled={windowClosed}
              hero
              sparkleId={
                announcement &&
                announcement.kind !== 'summary' &&
                announcement.productName === productsById.get(hero.productId)!.name
                  ? announcement.id
                  : undefined
              }
              onSelect={onSelectProduct}
            />
          </group>
        </group>
      )}

      {shelfSlots.map((slot, index) => {
        const product = productsById.get(slot.productId)
        if (!product) return null
        const placement = slotPosition(index)
        return (
          <group
            key={slot.productId}
            position={placement.position}
            rotation={placement.rotation}
          >
            <spotLight
              position={[0, 1.25, 1.4]}
              intensity={2.5}
              angle={0.48}
              penumbra={0.8}
              distance={4}
              color="#fff0db"
            />
            {/* Gallery track can, hung from the ceiling rail above */}
            <mesh position={[0, 1.41, 1.05]} rotation={[0.7, 0, 0]}>
              <cylinderGeometry args={[0.05, 0.06, 0.16, 14]} />
              <meshStandardMaterial color={INK} roughness={0.85} />
            </mesh>
            <ProductFrame
              product={product}
              imageUrl={slot.imageUrl}
              accent={accent}
              disabled={windowClosed}
              sparkleId={
                announcement &&
                announcement.kind !== 'summary' &&
                announcement.productName === product.name
                  ? announcement.id
                  : undefined
              }
              onSelect={onSelectProduct}
            />
          </group>
        )
      })}

      <Html center position={[0, 0.15, 4.55]} distanceFactor={5}>
        <span className="pointer-events-none whitespace-nowrap rounded-full bg-white/90 px-3 py-1 font-mono text-[9px] tracking-widest text-[#706a63] uppercase">
          entrance · walk in
        </span>
      </Html>

      {shadows && (
        <ContactShadows
          position={[0, 0.015, 0]}
          opacity={0.28}
          scale={13}
          blur={2.5}
          far={5}
          frames={1}
        />
      )}
    </>
  )
}
