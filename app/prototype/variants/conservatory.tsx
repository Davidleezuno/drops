'use client'

/**
 * PROTOTYPE VARIANT C — "The Conservatory"
 * Studio Sunday sells slow linen from a garden glasshouse: terracotta tiles,
 * white brick, a steel-and-glass gable roof throwing rafter shadows, a
 * potting bench for a counter, and plants doing most of the decorating.
 * The brightest, airiest answer of the three.
 */

import { ContactShadows, RoundedBox } from '@react-three/drei'
import { useMemo } from 'react'
import { CanvasTexture, DoubleSide, RepeatWrapping, Shape, ShapeGeometry, SRGBColorSpace } from 'three'

import { Plant, StringLights } from '@/components/world/decor'

import type { ProtoSeller } from '../data'
import {
  BookStack,
  FramedProduct,
  PottedOlive,
  SignBoard,
  StudioEnvironment,
  Vase,
  WindowGlow,
} from '../scene-kit'

const ROOM = { w: 11, d: 9, h: 2.7, ridge: 4.3 }
const STEEL = '#585b52'
const TILE_TONES = ['#c08a5c', '#b87f52', '#c99568']
const LINEN = ['#ddd3c0', '#4a453f', '#a9b39a', '#efe9dc']

/** Soft white-brick suggestion — staggered mortar lines at 4% alpha. */
function useBrickTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#f4efe6'
    ctx.fillRect(0, 0, 512, 512)
    ctx.strokeStyle = 'rgba(120,105,85,0.14)'
    ctx.lineWidth = 2
    const bh = 32
    const bw = 86
    for (let y = 0; y <= 512; y += bh) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(512, y)
      ctx.stroke()
      const offset = (y / bh) % 2 ? bw / 2 : 0
      for (let x = offset; x <= 512; x += bw) {
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x, y + bh)
        ctx.stroke()
      }
    }
    const tex = new CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = RepeatWrapping
    tex.repeat.set(4, 1.6)
    tex.colorSpace = SRGBColorSpace
    return tex
  }, [])
}

function Lighting() {
  return (
    <>
      <hemisphereLight args={['#eef4f4', '#d8c0a0', 0.5]} />
      {/* high sun raking through the glass roof */}
      <directionalLight
        position={[5, 10, 4]}
        intensity={3.4}
        color="#fff2dd"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-bias={-0.0004}
      />
      <pointLight position={[-3, 2.2, 2]} intensity={0.6} color="#fff6e4" distance={7} />
    </>
  )
}

function Shell() {
  const brick = useBrickTexture()
  const halfW = ROOM.w / 2
  const halfD = ROOM.d / 2
  const slope = Math.atan2(ROOM.ridge - ROOM.h, halfD) // ≈0.342
  const slopeLen = Math.hypot(ROOM.ridge - ROOM.h, halfD)

  const gable = useMemo(() => {
    const shape = new Shape()
    shape.moveTo(-halfD, 0)
    shape.lineTo(halfD, 0)
    shape.lineTo(0, ROOM.ridge - ROOM.h)
    shape.closePath()
    return new ShapeGeometry(shape)
  }, [halfD])

  const win = { w: 6.2, h: 2.1, y: 1.5 }

  return (
    <>
      {/* terracotta tile floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[ROOM.w + 0.4, ROOM.d + 0.4]} />
        <meshStandardMaterial color="#8a5c38" roughness={0.98} />
      </mesh>
      {Array.from({ length: 19 * 15 }, (_, i) => {
        const cols = 19
        const tx = i % cols
        const tz = Math.floor(i / cols)
        const size = 0.6
        return (
          <mesh
            key={i}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[-halfW + 0.05 + size / 2 + tx * size, 0.002, -halfD + 0.05 + size / 2 + tz * size]}
            receiveShadow
          >
            <planeGeometry args={[size - 0.025, size - 0.025]} />
            <meshStandardMaterial color={TILE_TONES[(tx + tz * 2) % 3]} roughness={0.92} />
          </mesh>
        )
      })}

      {/* brick side walls */}
      {[-halfW, halfW].map((x, i) => (
        <mesh
          key={x}
          rotation={[0, i === 0 ? Math.PI / 2 : -Math.PI / 2, 0]}
          position={[x, ROOM.h / 2, 0]}
          receiveShadow
        >
          <planeGeometry args={[ROOM.d, ROOM.h]} />
          <meshStandardMaterial map={brick} roughness={0.96} />
        </mesh>
      ))}
      {/* gable triangles above side walls */}
      {[-halfW, halfW].map((x, i) => (
        <mesh
          key={`g${x}`}
          geometry={gable}
          rotation={[0, i === 0 ? Math.PI / 2 : -Math.PI / 2, 0]}
          position={[x, ROOM.h, 0]}
        >
          <meshStandardMaterial color="#f4efe6" roughness={0.96} side={DoubleSide} />
        </mesh>
      ))}
      {/* front wall */}
      <mesh rotation={[0, Math.PI, 0]} position={[0, ROOM.h / 2, halfD]} receiveShadow>
        <planeGeometry args={[ROOM.w, ROOM.h]} />
        <meshStandardMaterial map={brick} roughness={0.96} />
      </mesh>

      {/* back wall around the grid window */}
      {(() => {
        const left = -win.w / 2
        const right = win.w / 2
        const segs = [
          { cx: (-halfW + left) / 2, w: left + halfW },
          { cx: (right + halfW) / 2, w: halfW - right },
        ]
        return segs.map((seg, i) => (
          <mesh key={i} position={[seg.cx, ROOM.h / 2, -halfD]} receiveShadow>
            <planeGeometry args={[seg.w, ROOM.h]} />
            <meshStandardMaterial map={brick} roughness={0.96} />
          </mesh>
        ))
      })()}
      <mesh position={[0, (win.y + win.h / 2 + ROOM.h) / 2, -halfD]}>
        <planeGeometry args={[win.w, ROOM.h - win.y - win.h / 2]} />
        <meshStandardMaterial map={brick} roughness={0.96} />
      </mesh>
      <mesh position={[0, (win.y - win.h / 2) / 2, -halfD]} receiveShadow>
        <planeGeometry args={[win.w, win.y - win.h / 2]} />
        <meshStandardMaterial map={brick} roughness={0.96} />
      </mesh>

      {/* steel grid window + the garden beyond */}
      <WindowGlow width={win.w + 0.8} height={win.h + 0.6} position={[0, win.y, -halfD - 0.35]} color="#f2f5e8" />
      {[-2.3, -0.7, 1.0, 2.6].map((x, i) => (
        <mesh key={i} position={[x, win.y - 0.62 + (i % 2) * 0.2, -halfD - 0.25]} scale={[1, 1.3, 1]}>
          <sphereGeometry args={[0.42 + (i % 3) * 0.12, 12, 10]} />
          <meshBasicMaterial color={['#bfd0a4', '#aec294', '#c8d6b2'][i % 3]} />
        </mesh>
      ))}
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={`v${i}`} position={[-win.w / 2 + (i * win.w) / 6, win.y, -halfD + 0.01]}>
          <boxGeometry args={[0.05, win.h, 0.05]} />
          <meshStandardMaterial color={STEEL} roughness={0.6} metalness={0.3} />
        </mesh>
      ))}
      {[win.y - win.h / 2, win.y, win.y + win.h / 2].map((y) => (
        <mesh key={`h${y}`} position={[0, y, -halfD + 0.01]}>
          <boxGeometry args={[win.w + 0.05, 0.05, 0.05]} />
          <meshStandardMaterial color={STEEL} roughness={0.6} metalness={0.3} />
        </mesh>
      ))}

      {/* glass gable roof + steel structure */}
      <mesh position={[0, (ROOM.h + ROOM.ridge) / 2, halfD / 2]} rotation={[-Math.PI / 2 + slope, 0, 0]}>
        <planeGeometry args={[ROOM.w, slopeLen + 0.15]} />
        <meshStandardMaterial color="#dce8ec" transparent opacity={0.16} roughness={0.15} side={DoubleSide} />
      </mesh>
      <mesh position={[0, (ROOM.h + ROOM.ridge) / 2, -halfD / 2]} rotation={[-Math.PI / 2 - slope, 0, 0]}>
        <planeGeometry args={[ROOM.w, slopeLen + 0.15]} />
        <meshStandardMaterial color="#dce8ec" transparent opacity={0.16} roughness={0.15} side={DoubleSide} />
      </mesh>
      {/* ridge + wall plates */}
      <mesh position={[0, ROOM.ridge, 0]}>
        <boxGeometry args={[ROOM.w + 0.2, 0.1, 0.1]} />
        <meshStandardMaterial color={STEEL} roughness={0.6} metalness={0.3} />
      </mesh>
      {[-halfD, halfD].map((z) => (
        <mesh key={z} position={[0, ROOM.h + 0.03, z]}>
          <boxGeometry args={[ROOM.w + 0.2, 0.08, 0.08]} />
          <meshStandardMaterial color={STEEL} roughness={0.6} metalness={0.3} />
        </mesh>
      ))}
      {/* rafters — these cast the money shadows */}
      {[-4.4, -2.2, 0, 2.2, 4.4].map((x) => (
        <group key={x}>
          <mesh position={[x, (ROOM.h + ROOM.ridge) / 2 + 0.02, halfD / 2]} rotation={[slope, 0, 0]} castShadow>
            <boxGeometry args={[0.05, 0.07, slopeLen + 0.1]} />
            <meshStandardMaterial color={STEEL} roughness={0.6} metalness={0.3} />
          </mesh>
          <mesh position={[x, (ROOM.h + ROOM.ridge) / 2 + 0.02, -halfD / 2]} rotation={[-slope, 0, 0]} castShadow>
            <boxGeometry args={[0.05, 0.07, slopeLen + 0.1]} />
            <meshStandardMaterial color={STEEL} roughness={0.6} metalness={0.3} />
          </mesh>
        </group>
      ))}
      {/* purlins */}
      {[-halfD / 2, halfD / 2].map((z) => (
        <mesh key={z} position={[0, (ROOM.h + ROOM.ridge) / 2, z]}>
          <boxGeometry args={[ROOM.w, 0.05, 0.05]} />
          <meshStandardMaterial color={STEEL} roughness={0.6} metalness={0.3} />
        </mesh>
      ))}
    </>
  )
}

/** Terracotta pot with a small tuft — bench and floor filler. */
function Pot({ position, scale = 1, green = true }: {
  position: [number, number, number]
  scale?: number
  green?: boolean
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.11, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.08, 0.22, 16]} />
        <meshStandardMaterial color="#b5713f" roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.225, 0]}>
        <cylinderGeometry args={[0.115, 0.115, 0.03, 16]} />
        <meshStandardMaterial color="#a3643a" roughness={0.92} />
      </mesh>
      {green && (
        <>
          <mesh position={[0, 0.36, 0]} scale={[1, 0.85, 1]} castShadow>
            <sphereGeometry args={[0.13, 14, 12]} />
            <meshStandardMaterial color="#7d8c6c" roughness={0.95} />
          </mesh>
          <mesh position={[0.09, 0.31, 0.05]} castShadow>
            <sphereGeometry args={[0.08, 12, 10]} />
            <meshStandardMaterial color="#8a9878" roughness={0.95} />
          </mesh>
        </>
      )}
    </group>
  )
}

/** Bolts of linen fabric, standing or stacked. */
function LinenBolts({ position, rotation = 0 }: {
  position: [number, number, number]
  rotation?: number
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {LINEN.map((color, i) => (
        <mesh
          key={color}
          position={[i * 0.1 - 0.15, 0.55, (i % 2) * 0.06]}
          rotation={[0, 0, 0.1 * (i - 1.5)]}
          castShadow
        >
          <cylinderGeometry args={[0.055, 0.055, 1.1, 14]} />
          <meshStandardMaterial color={color} roughness={0.96} />
        </mesh>
      ))}
    </group>
  )
}

/** Slatted wooden crate with folded linen stacks. */
function Crate({ position, rotation = 0, filled = true }: {
  position: [number, number, number]
  rotation?: number
  filled?: boolean
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.21, 0]} castShadow>
        <boxGeometry args={[0.62, 0.42, 0.44]} />
        <meshStandardMaterial color="#a98a63" roughness={0.9} />
      </mesh>
      {[0.08, 0.21, 0.34].map((y) => (
        <mesh key={y} position={[0, y, 0.225]}>
          <boxGeometry args={[0.64, 0.05, 0.015]} />
          <meshStandardMaterial color="#8f714e" roughness={0.9} />
        </mesh>
      ))}
      {filled && (
        <group position={[0, 0.42, 0]}>
          {LINEN.slice(0, 3).map((color, i) => (
            <RoundedBox key={color} args={[0.5, 0.09, 0.34]} radius={0.03} smoothness={3} position={[0, 0.05 + i * 0.09, 0]} rotation={[0, (i - 1) * 0.06, 0]} castShadow>
              <meshStandardMaterial color={color} roughness={0.97} />
            </RoundedBox>
          ))}
        </group>
      )}
    </group>
  )
}

/** Aged-wood potting bench — the counter, conservatory edition. */
function PottingBench({ position, rotation }: {
  position: [number, number, number]
  rotation: [number, number, number]
}) {
  return (
    <group position={position} rotation={rotation}>
      {[[-1.25, -0.24], [1.25, -0.24], [-1.25, 0.24], [1.25, 0.24]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.45, z]} castShadow>
          <boxGeometry args={[0.07, 0.9, 0.07]} />
          <meshStandardMaterial color="#8f714e" roughness={0.9} />
        </mesh>
      ))}
      {/* slatted top */}
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} position={[-1.2 + i * 0.4, 0.92, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.35, 0.04, 0.6]} />
          <meshStandardMaterial color="#a98a63" roughness={0.88} />
        </mesh>
      ))}
      {/* lower shelf */}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[2.6, 0.035, 0.55]} />
        <meshStandardMaterial color="#97795a" roughness={0.9} />
      </mesh>
      {/* back rail */}
      <mesh position={[0, 1.25, -0.28]}>
        <boxGeometry args={[2.6, 0.06, 0.04]} />
        <meshStandardMaterial color="#8f714e" roughness={0.9} />
      </mesh>
      {/* styled top: pots, linen, kraft parcel, books */}
      <Pot position={[-0.95, 0.94, -0.1]} scale={0.85} />
      <Pot position={[1.0, 0.94, 0.05]} scale={0.7} green={false} />
      <group position={[0.15, 0.94, 0]}>
        {LINEN.map((color, i) => (
          <RoundedBox key={color} args={[0.55, 0.08, 0.4]} radius={0.03} smoothness={3} position={[0, 0.045 + i * 0.08, 0]} rotation={[0, (i - 1.5) * 0.05, 0]} castShadow>
            <meshStandardMaterial color={color} roughness={0.97} />
          </RoundedBox>
        ))}
      </group>
      <BookStack position={[-0.45, 0.94, 0.12]} count={2} rotation={0.3} />
      {/* shelf below: more pots + a watering can */}
      <Pot position={[-0.7, 0.32, 0]} scale={0.8} green={false} />
      <group position={[0.5, 0.32, 0]}>
        <mesh position={[0, 0.09, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.11, 0.18, 16]} />
          <meshStandardMaterial color="#7d8b84" roughness={0.5} metalness={0.5} />
        </mesh>
        <mesh position={[0.14, 0.12, 0]} rotation={[0, 0, -0.7]}>
          <cylinderGeometry args={[0.015, 0.025, 0.22, 8]} />
          <meshStandardMaterial color="#7d8b84" roughness={0.5} metalness={0.5} />
        </mesh>
      </group>
    </group>
  )
}

/** Trailing pothos in a hanging pot, cord up to the rafters. */
function HangingPlant({ position, drop = 0.8 }: {
  position: [number, number, number]
  drop?: number
}) {
  return (
    <group position={position}>
      <mesh position={[0, -drop / 2, 0]}>
        <cylinderGeometry args={[0.006, 0.006, drop, 6]} />
        <meshStandardMaterial color="#8a7a63" roughness={0.95} />
      </mesh>
      <mesh position={[0, -drop - 0.07, 0]} castShadow>
        <sphereGeometry args={[0.11, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#b5713f" roughness={0.92} />
      </mesh>
      {[
        [0, -drop - 0.16, 0, 0.12],
        [0.12, -drop - 0.28, 0.06, 0.09],
        [-0.1, -drop - 0.34, -0.04, 0.08],
        [0.04, -drop - 0.46, -0.08, 0.07],
        [-0.06, -drop - 0.55, 0.07, 0.055],
      ].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <sphereGeometry args={[r, 12, 10]} />
          <meshStandardMaterial color={i % 2 ? '#7d8c6c' : '#6d7d5e'} roughness={0.95} />
        </mesh>
      ))}
    </group>
  )
}

export function ConservatoryScene({ seller }: { seller: ProtoSeller }) {
  const [set, shirt, trouser] = seller.products
  const halfW = ROOM.w / 2
  const halfD = ROOM.d / 2

  return (
    <>
      <color attach="background" args={['#dfe7e4']} />
      <fog attach="fog" args={['#dfe7e4', 18, 34]} />
      <StudioEnvironment tint="#f2f7ee" />
      <Lighting />
      <Shell />

      {/* gallery wall: hero flanked by the two pieces */}
      <group position={[-halfW + 0.06, 1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <FramedProduct product={set} width={1.0} ratio={0.6} frame="#c9a176" cardY={-1.32} cardZ={0.4} />
      </group>
      <group position={[-halfW + 0.06, 1.45, 2.4]} rotation={[0, Math.PI / 2, 0]}>
        <FramedProduct product={shirt} width={0.78} ratio={1} frame="#c9a176" />
      </group>
      <group position={[-halfW + 0.06, 1.45, -2.4]} rotation={[0, Math.PI / 2, 0]}>
        <FramedProduct product={trouser} width={0.78} ratio={0.82} frame="#c9a176" />
      </group>

      {/* potting bench counter on the right wall */}
      <PottingBench position={[halfW - 0.5, 0, 0.3]} rotation={[0, -Math.PI / 2, 0]} />

      {/* crate displays + linen bolts */}
      <Crate position={[-2.2, 0, 1.6]} rotation={0.2} />
      <Crate position={[-1.45, 0, 1.85]} rotation={-0.3} />
      <Crate position={[-1.85, 0.44, 1.7]} rotation={0.55} filled={false} />
      <LinenBolts position={[-3.4, 0, 1.2]} rotation={0.4} />
      <LinenBolts position={[4.35, 0, 2.5]} rotation={-0.7} />

      {/* greenery layers */}
      <PottedOlive position={[halfW - 0.7, 0, -3.6]} scale={1.15} />
      <PottedOlive position={[-halfW + 0.7, 0, -3.6]} scale={0.95} />
      <Plant position={[3.4, 0, -3.9]} scale={1.1} tall />
      <Pot position={[1.8, 0, -3.8]} scale={1.3} />
      <Pot position={[-3.2, 0, -3.7]} scale={1.1} />
      <Pot position={[4.6, 0, 2.6]} scale={1.2} />
      <HangingPlant position={[-2.2, 3.55, halfD / 2]} drop={0.85} />
      <HangingPlant position={[2.6, 3.55, -halfD / 2]} drop={0.7} />
      <HangingPlant position={[0.4, 3.55, halfD / 2]} drop={1.0} />

      {/* café bulbs under the purlins */}
      <StringLights from={[-5.3, 3.42, halfD / 2]} to={[5.3, 3.42, halfD / 2]} sag={0.3} />
      <StringLights from={[-5.3, 3.42, -halfD / 2]} to={[5.3, 3.42, -halfD / 2]} sag={0.3} />

      {/* rope-hung fascia from the ridge */}
      <group position={[0, 2.88, -1.1]} rotation={[0, 0, -0.007]}>
        {[-0.72, 0.72].map((x) => (
          <mesh key={x} position={[x, 0.72, 0]}>
            <cylinderGeometry args={[0.007, 0.007, 1.42, 6]} />
            <meshStandardMaterial color="#8a7a63" roughness={0.95} />
          </mesh>
        ))}
        <SignBoard
          title={seller.name}
          subtitle={seller.dropTitle}
          accent={seller.accent}
          width={2.0}
          position={[0, 0, 0]}
          board="#5c4632"
        />
      </group>

      <Vase position={[halfW - 0.45, 0, 3.8]} scale={1.7} color="#cfc4b2" stem={false} />

      <ContactShadows position={[0, 0.015, 0]} opacity={0.3} scale={13} blur={2.4} far={4.5} frames={1} />
    </>
  )
}
