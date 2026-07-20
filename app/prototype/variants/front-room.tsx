'use client'

/**
 * PROTOTYPE VARIANT B — "The Front Room"
 * Soft Hour Skin sells from a real living room: walnut credenza, picture
 * ledges with leaning frames, a bouclé sofa you'll want to sit on, tungsten
 * lamp pools against soft window daylight. The most literal answer to
 * "home-based business" — the store *is* the home.
 */

import { ContactShadows, RoundedBox } from '@react-three/drei'
import { DoubleSide, TorusGeometry } from 'three'

import { WallArt } from '@/components/world/decor'

import type { ProtoSeller } from '../data'
import {
  BookStack,
  BRASS,
  FramedProduct,
  INK,
  PottedOlive,
  Rug,
  SheerCurtain,
  SignBoard,
  StudioEnvironment,
  useCanvasTexture,
  Vase,
  WindowGlow,
} from '../scene-kit'

const ROOM = { w: 10, d: 8, h: 3.0 }
const WALNUT = '#7a5c40'
const WALNUT_DARK = '#5f4630'
const BOUCLE = '#e8e0cf'
const PLANKS = ['#8a6d4f', '#7d6247', '#937556', '#866950']

function Lighting() {
  return (
    <>
      <hemisphereLight args={['#f6efe4', '#a68d72', 0.35]} />
      {/* soft afternoon through the back window */}
      <directionalLight
        position={[2.5, 5.5, -8]}
        intensity={2.2}
        color="#fff1dc"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-bias={-0.0004}
      />
      {/* tungsten pools: arc lamp + table lamp */}
      <pointLight position={[2.55, 2.6, 0.3]} intensity={1.6} color="#ffd9a0" distance={5} />
      <pointLight position={[3.05, 1.35, 2.3]} intensity={1.1} color="#ffcf95" distance={4} />
      <pointLight position={[-4.2, 2.2, -0.5]} intensity={0.5} color="#ffe9cf" distance={3.5} />
    </>
  )
}

function Shell() {
  const halfW = ROOM.w / 2
  const halfD = ROOM.d / 2
  const win = { x: 1.1, w: 2.9, h: 1.85, y: 1.55 }

  return (
    <>
      {/* walnut planks */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[ROOM.w, ROOM.d]} />
        <meshStandardMaterial color="#6f5844" roughness={0.98} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => {
        const depth = ROOM.d / 12
        return (
          <mesh
            key={i}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.002, -halfD + depth / 2 + i * depth]}
            receiveShadow
          >
            <planeGeometry args={[ROOM.w, depth - 0.02]} />
            <meshStandardMaterial color={PLANKS[i % 4]} roughness={0.88} />
          </mesh>
        )
      })}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM.h, 0]}>
        <planeGeometry args={[ROOM.w, ROOM.d]} />
        <meshStandardMaterial color="#f7f2e9" roughness={0.98} />
      </mesh>

      <mesh rotation={[0, Math.PI / 2, 0]} position={[-halfW, ROOM.h / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM.d, ROOM.h]} />
        <meshStandardMaterial color="#f4efe7" roughness={0.96} />
      </mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[halfW, ROOM.h / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM.d, ROOM.h]} />
        <meshStandardMaterial color="#f4efe7" roughness={0.96} />
      </mesh>
      <mesh rotation={[0, Math.PI, 0]} position={[0, ROOM.h / 2, halfD]} receiveShadow>
        <planeGeometry args={[ROOM.w, ROOM.h]} />
        <meshStandardMaterial color="#f4efe7" roughness={0.96} />
      </mesh>

      {/* back wall around the window */}
      {(() => {
        const left = win.x - win.w / 2 // -0.35
        const right = win.x + win.w / 2 // 2.55
        const segs = [
          { cx: (-halfW + left) / 2, w: left + halfW },
          { cx: (right + halfW) / 2, w: halfW - right },
        ]
        return segs.map((seg, i) => (
          <mesh key={i} position={[seg.cx, ROOM.h / 2, -halfD]} receiveShadow>
            <planeGeometry args={[seg.w, ROOM.h]} />
            <meshStandardMaterial color="#f4efe7" roughness={0.96} />
          </mesh>
        ))
      })()}
      <mesh position={[win.x, (win.y + win.h / 2 + ROOM.h) / 2, -halfD]}>
        <planeGeometry args={[win.w, ROOM.h - win.y - win.h / 2]} />
        <meshStandardMaterial color="#f4efe7" roughness={0.96} />
      </mesh>
      <mesh position={[win.x, (win.y - win.h / 2) / 2, -halfD]} receiveShadow>
        <planeGeometry args={[win.w, win.y - win.h / 2]} />
        <meshStandardMaterial color="#f4efe7" roughness={0.96} />
      </mesh>

      {/* window: trim, mullions, garden glow beyond */}
      <WindowGlow
        width={win.w + 0.5}
        height={win.h + 0.4}
        position={[win.x, win.y, -halfD - 0.3]}
        color="#fdf3df"
      />
      {/* garden silhouettes outside the glass */}
      {[
        [win.x - 0.85, win.y - 0.55, 0.42],
        [win.x + 0.95, win.y - 0.5, 0.55],
      ].map(([x, y, r], i) => (
        <mesh key={i} position={[x, y, -halfD - 0.22]} scale={[1, 1.25, 1]}>
          <sphereGeometry args={[r, 14, 12]} />
          <meshBasicMaterial color="#c3d4a8" />
        </mesh>
      ))}
      <mesh position={[win.x, win.y, -halfD + 0.01]}>
        <boxGeometry args={[0.05, win.h, 0.05]} />
        <meshStandardMaterial color={INK} roughness={0.8} />
      </mesh>
      <mesh position={[win.x, win.y, -halfD + 0.01]}>
        <boxGeometry args={[win.w, 0.05, 0.05]} />
        <meshStandardMaterial color={INK} roughness={0.8} />
      </mesh>
      {[-win.w / 2, win.w / 2].map((dx) => (
        <mesh key={dx} position={[win.x + dx, win.y, -halfD + 0.02]}>
          <boxGeometry args={[0.09, win.h + 0.09, 0.06]} />
          <meshStandardMaterial color={INK} roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[win.x, win.y + win.h / 2, -halfD + 0.02]}>
        <boxGeometry args={[win.w + 0.18, 0.09, 0.06]} />
        <meshStandardMaterial color={INK} roughness={0.8} />
      </mesh>
      <mesh position={[win.x, win.y - win.h / 2 - 0.03, -halfD + 0.06]} castShadow>
        <boxGeometry args={[win.w + 0.24, 0.05, 0.16]} />
        <meshStandardMaterial color={WALNUT} roughness={0.85} />
      </mesh>

      {/* sheers on a slim brass rod, pooling slightly */}
      <mesh position={[win.x, win.y + win.h / 2 + 0.12, -halfD + 0.18]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.013, 0.013, win.w + 0.7, 10]} />
        <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.35} />
      </mesh>
      <SheerCurtain
        width={1.15}
        height={win.h + 0.4}
        position={[win.x - win.w / 2 + 0.5, win.y - 0.08, -halfD + 0.16]}
      />
      <SheerCurtain
        width={1.15}
        height={win.h + 0.4}
        position={[win.x + win.w / 2 - 0.5, win.y - 0.08, -halfD + 0.16]}
      />

      {/* skirting */}
      <mesh position={[0, 0.05, -halfD + 0.02]}>
        <boxGeometry args={[ROOM.w, 0.1, 0.03]} />
        <meshStandardMaterial color="#e8e1d4" roughness={0.95} />
      </mesh>
      {[-halfW + 0.02, halfW - 0.02].map((x) => (
        <mesh key={x} position={[x, 0.05, 0]}>
          <boxGeometry args={[0.03, 0.1, ROOM.d]} />
          <meshStandardMaterial color="#e8e1d4" roughness={0.95} />
        </mesh>
      ))}
    </>
  )
}

/** Walnut credenza on tapered legs — the room's anchor. */
function Credenza({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {[[-0.95, -0.18], [0.95, -0.18], [-0.95, 0.18], [0.95, 0.18]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.14, z]} rotation={[z * 0.3, 0, -x * 0.06]}>
          <cylinderGeometry args={[0.02, 0.014, 0.28, 8]} />
          <meshStandardMaterial color={WALNUT_DARK} roughness={0.85} />
        </mesh>
      ))}
      <RoundedBox args={[2.2, 0.55, 0.48]} radius={0.03} smoothness={3} position={[0, 0.55, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={WALNUT} roughness={0.72} />
      </RoundedBox>
      {/* door reveals */}
      {[-0.37, 0.37].map((x) => (
        <mesh key={x} position={[x, 0.55, 0.245]}>
          <planeGeometry args={[0.66, 0.42]} />
          <meshStandardMaterial color={WALNUT_DARK} roughness={0.8} />
        </mesh>
      ))}
      {[-0.37, 0.37].map((x) => (
        <mesh key={`k${x}`} position={[x + 0.26, 0.55, 0.25]}>
          <sphereGeometry args={[0.018, 10, 10]} />
          <meshStandardMaterial color={BRASS} metalness={0.85} roughness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

/** Oak picture ledge; things lean on it. */
function Ledge({ width, position }: { width: number; position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[0.09, 0.035, width]} />
        <meshStandardMaterial color="#c9a176" roughness={0.85} />
      </mesh>
      <mesh position={[-0.035, 0.03, 0]}>
        <boxGeometry args={[0.02, 0.05, width]} />
        <meshStandardMaterial color="#c9a176" roughness={0.85} />
      </mesh>
    </group>
  )
}

/** Arc floor lamp: weighted base, brass stem, quarter-arc over the sofa. */
function ArcLamp({ position, rotation = [0, 0, 0] }: {
  position: [number, number, number]
  rotation?: [number, number, number]
}) {
  const arc = new TorusGeometry(1.05, 0.014, 8, 32, Math.PI / 2)
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.16, 0.18, 0.04, 20]} />
        <meshStandardMaterial color={INK} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.95, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 1.9, 8]} />
        <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.35} />
      </mesh>
      {/* quarter arc in the vertical xy-plane: stem top → over the seat */}
      <mesh geometry={arc} position={[-1.05, 1.9, 0]}>
        <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.35} />
      </mesh>
      <group position={[-1.05, 2.86, 0]}>
        <mesh position={[0, -0.09, 0]}>
          <cylinderGeometry args={[0.13, 0.16, 0.18, 20, 1, true]} />
          <meshStandardMaterial color="#f3ead8" roughness={0.9} side={DoubleSide} />
        </mesh>
        <mesh position={[0, -0.14, 0]}>
          <sphereGeometry args={[0.045, 10, 10]} />
          <meshBasicMaterial color="#ffdfae" toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}

/** Bouclé sofa: rounded everything, one accent cushion. */
function Sofa({ position, rotation, accent }: {
  position: [number, number, number]
  rotation: [number, number, number]
  accent: string
}) {
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[0.95, 0.32, 2.3]} radius={0.12} smoothness={4} position={[0, 0.3, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={BOUCLE} roughness={0.98} />
      </RoundedBox>
      <RoundedBox args={[0.24, 0.62, 2.3]} radius={0.1} smoothness={4} position={[0.42, 0.62, 0]} castShadow>
        <meshStandardMaterial color={BOUCLE} roughness={0.98} />
      </RoundedBox>
      {[-1.05, 1.05].map((z) => (
        <RoundedBox key={z} args={[0.95, 0.5, 0.2]} radius={0.08} smoothness={4} position={[0, 0.55, z]} castShadow>
          <meshStandardMaterial color={BOUCLE} roughness={0.98} />
        </RoundedBox>
      ))}
      {/* back cushions, slightly lived-in */}
      {[-0.55, 0.55].map((z, i) => (
        <RoundedBox key={z} args={[0.2, 0.5, 0.95]} radius={0.09} smoothness={4} position={[0.28, 0.72, z]} rotation={[0, 0, -0.06 - i * 0.02]} castShadow>
          <meshStandardMaterial color="#e9e2d3" roughness={0.98} />
        </RoundedBox>
      ))}
      <RoundedBox args={[0.16, 0.34, 0.34]} radius={0.07} smoothness={4} position={[0.1, 0.62, -0.9]} rotation={[0.15, 0.3, -0.1]} castShadow>
        <meshStandardMaterial color={accent} roughness={0.95} />
      </RoundedBox>
      {/* a knit throw over the arm */}
      <RoundedBox args={[0.7, 0.055, 0.5]} radius={0.025} smoothness={3} position={[-0.12, 0.83, 1.05]} rotation={[0.04, 0.15, -0.1]} castShadow>
        <meshStandardMaterial color="#b9accf" roughness={0.98} />
      </RoundedBox>
    </group>
  )
}

/** Travertine pedestal coffee table with styling on top. */
function CoffeeTable({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.19, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.26, 0.38, 20]} />
        <meshStandardMaterial color="#cfc0a4" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.41, 0]} scale={[1.35, 1, 0.85]} castShadow>
        <cylinderGeometry args={[0.52, 0.52, 0.05, 28]} />
        <meshStandardMaterial color="#d6c8ac" roughness={0.62} />
      </mesh>
      <BookStack position={[-0.28, 0.44, 0.08]} count={2} rotation={0.5} />
      <Vase position={[0.3, 0.44, -0.12]} scale={0.75} color="#e5dce9" />
      {/* the serum, as a styled object */}
      <group position={[0.05, 0.44, 0.28]}>
        <mesh position={[0, 0.075, 0]} castShadow>
          <cylinderGeometry args={[0.035, 0.035, 0.15, 16]} />
          <meshStandardMaterial color="#efe9f5" roughness={0.25} transparent opacity={0.85} />
        </mesh>
        <mesh position={[0, 0.17, 0]}>
          <cylinderGeometry args={[0.014, 0.014, 0.05, 10]} />
          <meshStandardMaterial color="#b9aecb" roughness={0.5} />
        </mesh>
      </group>
    </group>
  )
}

/** Small round side table + shaded table lamp. */
function SideTable({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.26, 0]}>
        <cylinderGeometry args={[0.025, 0.16, 0.5, 12]} />
        <meshStandardMaterial color={WALNUT_DARK} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.52, 0]} castShadow>
        <cylinderGeometry args={[0.26, 0.26, 0.03, 22]} />
        <meshStandardMaterial color={WALNUT} roughness={0.75} />
      </mesh>
      <group position={[0.05, 0.54, 0]}>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.012, 0.05, 0.24, 10]} />
          <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.09, 0.12, 0.14, 18, 1, true]} />
          <meshStandardMaterial color="#f3ead8" roughness={0.9} side={DoubleSide} />
        </mesh>
        <mesh position={[0, 0.26, 0]}>
          <sphereGeometry args={[0.035, 10, 10]} />
          <meshBasicMaterial color="#ffdfae" toneMapped={false} />
        </mesh>
      </group>
      <BookStack position={[-0.1, 0.545, 0.1]} count={2} rotation={-0.3} />
    </group>
  )
}

/** The brand moment: a framed letterpress-style print above the credenza. */
function BrandPrint({ seller, position, rotation }: {
  seller: ProtoSeller
  position: [number, number, number]
  rotation: [number, number, number]
}) {
  const texture = useCanvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#faf6ee'
    ctx.fillRect(0, 0, w, h)
    const display = getComputedStyle(document.documentElement)
      .getPropertyValue('--font-bricolage').split(',')[0].trim() || 'sans-serif'
    const sans = getComputedStyle(document.documentElement)
      .getPropertyValue('--font-instrument').split(',')[0].trim() || 'sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#332e28'
    let nameSize = h * 0.17
    ctx.font = `800 ${nameSize}px ${display}`
    while (ctx.measureText(seller.name).width > w * 0.82 && nameSize > 12) {
      nameSize *= 0.93
      ctx.font = `800 ${nameSize}px ${display}`
    }
    ctx.fillText(seller.name, w / 2, h * 0.42)
    ctx.fillStyle = seller.accent
    ctx.fillRect(w / 2 - w * 0.07, h * 0.54, w * 0.14, 4)
    ctx.font = `500 ${h * 0.075}px ${sans}`
    ctx.fillStyle = '#6b6257'
    ctx.fillText(seller.dropTitle, w / 2, h * 0.68)
  }, 900, 600)
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[1.35, 0.95, 0.04]} radius={0.015} smoothness={3} castShadow>
        <meshStandardMaterial color="#c9a176" roughness={0.8} />
      </RoundedBox>
      <mesh position={[0, 0, 0.022]}>
        <planeGeometry args={[1.25, 0.85]} />
        {texture ? (
          <meshStandardMaterial key={texture.uuid} map={texture} roughness={0.94} />
        ) : (
          <meshStandardMaterial key="plain" color="#faf6ee" roughness={0.94} />
        )}
      </mesh>
    </group>
  )
}

export function FrontRoomScene({ seller }: { seller: ProtoSeller }) {
  const [cleanser, duo, serum] = seller.products
  const halfW = ROOM.w / 2
  const halfD = ROOM.d / 2

  return (
    <>
      <color attach="background" args={['#e5ddcf']} />
      <fog attach="fog" args={['#e5ddcf', 16, 30]} />
      <StudioEnvironment tint="#f6efff" />
      <Lighting />
      <Shell />

      <Rug width={5.6} depth={3.7} color="#ece4d2" border="#c4b191" position={[-0.4, 0.012, 0.5]} />

      {/* the anchor wall: credenza + stacked ledges + leaning frames */}
      <Credenza position={[-halfW + 0.28, 0, -0.4]} />
      <group position={[-halfW + 0.28, 0, -0.4]} rotation={[0, Math.PI / 2, 0]}>
        {/* hero ad poster leaning on the credenza top */}
        <FramedProduct
          product={cleanser}
          width={0.72}
          ratio={0.64}
          frame={INK}
          position={[0.1, 1.45, -0.55]}
          lean={-0.09}
          cardY={-1.2}
          cardZ={0.7}
        />
        <BookStack position={[0.95, 0.83, 0.45]} count={3} rotation={1.2} />
        <Vase position={[-0.75, 0.83, 0.42]} scale={0.9} color="#e5dce9" />
        {/* two ledges up the wall, frames leaning on them */}
        <Ledge width={2.2} position={[-0.32, 1.98, 0]} />
        <FramedProduct
          product={duo}
          width={0.5}
          ratio={1}
          frame="#c9a176"
          position={[-0.36, 2.33, -0.78]}
          lean={-0.09}
          cardY={-0.6}
          cardZ={0.22}
        />
        <FramedProduct
          product={serum}
          width={0.46}
          ratio={0.72}
          frame="#c9a176"
          position={[-0.36, 2.37, 0.82]}
          lean={-0.09}
          cardY={-0.62}
          cardZ={0.22}
        />
      </group>
      {/* the brand print hangs like a framed poster on the back wall */}
      <BrandPrint seller={seller} position={[-2.4, 1.85, -halfD + 0.04]} rotation={[0, 0, 0]} />

      {/* seating group */}
      <Sofa position={[2.5, 0, 0.3]} rotation={[0, 0, 0]} accent={seller.accent} />
      <CoffeeTable position={[-0.3, 0, 0.35]} />
      <ArcLamp position={[3.6, 0, 0.3]} rotation={[0, -Math.PI / 2, 0]} />
      <SideTable position={[2.6, 0, 2.4]} />

      {/* greenery + quiet art */}
      <PottedOlive position={[-0.9, 0, -3.35]} scale={1.05} />
      <PottedOlive position={[4.35, 0, -3.3]} scale={0.85} />
      <group rotation={[0, -Math.PI / 2, 0]} position={[halfW - 0.03, 1.7, -1.6]}>
        <WallArt position={[0, 0, 0]} rotation={[0, 0, 0]} variant="arch" />
      </group>
      <group rotation={[0, -Math.PI / 2, 0]} position={[halfW - 0.03, 1.7, -0.75]}>
        <WallArt position={[0, 0, 0]} rotation={[0, 0, 0]} variant="sun" />
      </group>

      <ContactShadows position={[0, 0.015, 0]} opacity={0.3} scale={12} blur={2.4} far={4} frames={1} />
    </>
  )
}
