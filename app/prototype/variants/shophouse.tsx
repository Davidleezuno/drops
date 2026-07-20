'use client'

/**
 * PROTOTYPE VARIANT A — "The Corner Shophouse"
 * Roti Wife's Sunday Panipuri Club. The spec's neighborhood-shop vibe taken
 * to interior-design grade: limewash plaster, oak beams, an arched niche for
 * the hero, brass picture lights, a fluted counter, and one big mullioned
 * window pouring mid-morning light across a bordered rug.
 */

import { ContactShadows, RoundedBox } from '@react-three/drei'
import { useMemo } from 'react'
import { Shape, ShapeGeometry } from 'three'

import { Awning, CounterClutter, PendantLamp } from '@/components/world/decor'

import type { ProtoSeller } from '../data'
import {
  BookStack,
  BRASS,
  FramedProduct,
  INK,
  MATBOARD,
  OAK_DARK,
  PictureLight,
  PLASTER,
  PottedOlive,
  Rug,
  SheerCurtain,
  SignBoard,
  StudioEnvironment,
  useCanvasTexture,
  Vase,
  WindowGlow,
} from '../scene-kit'

const ROOM = { w: 12, d: 9, h: 3.5 }
const door = { x: -3.2, w: 1.5, h: 2.35 }
const PLANKS = ['#d9bfa0', '#cfb493', '#e2c9ac', '#d4ba98']

function archGeometry(width: number, height: number) {
  const r = width / 2
  const straight = height - r
  const shape = new Shape()
  shape.moveTo(-r, 0)
  shape.lineTo(r, 0)
  shape.lineTo(r, straight)
  shape.absarc(0, straight, r, 0, Math.PI, false)
  shape.lineTo(-r, 0)
  return new ShapeGeometry(shape, 32)
}

function Lighting({ accent }: { accent: string }) {
  return (
    <>
      <hemisphereLight args={['#fdf4e6', '#cbb291', 0.35]} />
      {/* mid-morning sun through the big window */}
      <directionalLight
        position={[9, 6.5, 2.5]}
        intensity={2.8}
        color="#ffeed6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0004}
      />
      {/* warm bounce off the back wall + counter glow */}
      <pointLight position={[0, 2.6, -3.2]} intensity={1.1} color="#ffe4c2" distance={7} />
      <pointLight position={[3.4, 2.1, -3.4]} intensity={0.9} color="#ffd9a8" distance={4} />
      {/* faint accent wash inside the arch */}
      <pointLight position={[0, 2.0, -3.9]} intensity={0.8} color={accent} distance={2.6} />
    </>
  )
}

function Shell({ accent }: { accent: string }) {
  const arch = useMemo(() => archGeometry(2.3, 2.65), [])
  const archTrim = useMemo(() => archGeometry(2.52, 2.79), [])
  const halfW = ROOM.w / 2
  const halfD = ROOM.d / 2
  const win = { w: 3.4, h: 2.05, y: 1.55, z: 0.2 }

  return (
    <>
      {/* oak plank floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[ROOM.w, ROOM.d]} />
        <meshStandardMaterial color="#a98f70" roughness={0.98} />
      </mesh>
      {Array.from({ length: 14 }, (_, i) => {
        const depth = ROOM.d / 14
        return (
          <mesh
            key={i}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.002, -halfD + depth / 2 + i * depth]}
            receiveShadow
          >
            <planeGeometry args={[ROOM.w, depth - 0.02]} />
            <meshStandardMaterial color={PLANKS[i % 4]} roughness={0.9} />
          </mesh>
        )
      })}

      {/* ceiling + oak beams */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM.h, 0]}>
        <planeGeometry args={[ROOM.w, ROOM.d]} />
        <meshStandardMaterial color="#f6f0e4" roughness={0.98} />
      </mesh>
      {[-4.8, -2.4, 0, 2.4, 4.8].map((x) => (
        <mesh key={x} position={[x, ROOM.h - 0.09, 0]} castShadow>
          <boxGeometry args={[0.16, 0.18, ROOM.d]} />
          <meshStandardMaterial color={OAK_DARK} roughness={0.85} />
        </mesh>
      ))}

      {/* walls: back, left, front — right wall built around the window */}
      <mesh position={[0, ROOM.h / 2, -halfD]} receiveShadow>
        <planeGeometry args={[ROOM.w, ROOM.h]} />
        <meshStandardMaterial color={PLASTER} roughness={0.96} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-halfW, ROOM.h / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM.d, ROOM.h]} />
        <meshStandardMaterial color={PLASTER} roughness={0.96} />
      </mesh>
      {/* front wall, with a real doorway to the street */}
      {(() => {
        const left = door.x - door.w / 2
        const right = door.x + door.w / 2
        const segs = [
          { cx: (-halfW + left) / 2, w: left + halfW },
          { cx: (right + halfW) / 2, w: halfW - right },
        ]
        return segs.map((seg, i) => (
          <mesh
            key={i}
            rotation={[0, Math.PI, 0]}
            position={[seg.cx, ROOM.h / 2, halfD]}
            receiveShadow
          >
            <planeGeometry args={[seg.w, ROOM.h]} />
            <meshStandardMaterial color={PLASTER} roughness={0.96} />
          </mesh>
        ))
      })()}
      <mesh
        rotation={[0, Math.PI, 0]}
        position={[door.x, (door.h + ROOM.h) / 2, halfD]}
      >
        <planeGeometry args={[door.w, ROOM.h - door.h]} />
        <meshStandardMaterial color={PLASTER} roughness={0.96} />
      </mesh>
      {/* daylight through the open door + ink trim */}
      <WindowGlow
        width={door.w + 0.3}
        height={door.h + 0.2}
        position={[door.x, door.h / 2, halfD + 0.3]}
        rotation={[0, Math.PI, 0]}
        color="#fff4e0"
      />
      {[-door.w / 2, door.w / 2].map((dx) => (
        <mesh key={dx} position={[door.x + dx, door.h / 2, halfD - 0.03]} castShadow>
          <boxGeometry args={[0.08, door.h, 0.1]} />
          <meshStandardMaterial color={INK} roughness={0.82} />
        </mesh>
      ))}
      <mesh position={[door.x, door.h + 0.04, halfD - 0.03]} castShadow>
        <boxGeometry args={[door.w + 0.24, 0.08, 0.1]} />
        <meshStandardMaterial color={INK} roughness={0.82} />
      </mesh>
      {/* right wall segments around the window opening */}
      {(() => {
        const near = win.z - win.w / 2
        const far = win.z + win.w / 2
        const segs = [
          { cz: (-halfD + near) / 2, w: near + halfD },
          { cz: (far + halfD) / 2, w: halfD - far },
        ]
        return segs.map((seg, i) => (
          <mesh
            key={i}
            rotation={[0, -Math.PI / 2, 0]}
            position={[halfW, ROOM.h / 2, seg.cz]}
            receiveShadow
          >
            <planeGeometry args={[seg.w, ROOM.h]} />
            <meshStandardMaterial color={PLASTER} roughness={0.96} />
          </mesh>
        ))
      })()}
      <mesh
        rotation={[0, -Math.PI / 2, 0]}
        position={[halfW, (win.y + win.h / 2 + ROOM.h) / 2, win.z]}
      >
        <planeGeometry args={[win.w, ROOM.h - win.y - win.h / 2]} />
        <meshStandardMaterial color={PLASTER} roughness={0.96} />
      </mesh>
      <mesh
        rotation={[0, -Math.PI / 2, 0]}
        position={[halfW, (win.y - win.h / 2) / 2, win.z]}
        receiveShadow
      >
        <planeGeometry args={[win.w, win.y - win.h / 2]} />
        <meshStandardMaterial color={PLASTER} roughness={0.96} />
      </mesh>

      {/* window: ink mullions, oak sill, blown-out daylight beyond */}
      <WindowGlow
        width={win.w + 0.6}
        height={win.h + 0.5}
        position={[halfW + 0.35, win.y, win.z]}
        rotation={[0, -Math.PI / 2, 0]}
      />
      {[-win.w / 6, win.w / 6].map((dz) => (
        <mesh key={dz} position={[halfW - 0.01, win.y, win.z + dz]}>
          <boxGeometry args={[0.06, win.h, 0.045]} />
          <meshStandardMaterial color={INK} roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[halfW - 0.01, win.y, win.z]}>
        <boxGeometry args={[0.06, 0.045, win.w]} />
        <meshStandardMaterial color={INK} roughness={0.8} />
      </mesh>
      {/* frame around opening */}
      {[-win.w / 2, win.w / 2].map((dz) => (
        <mesh key={dz} position={[halfW - 0.02, win.y, win.z + dz]}>
          <boxGeometry args={[0.1, win.h + 0.1, 0.07]} />
          <meshStandardMaterial color={INK} roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[halfW - 0.02, win.y + win.h / 2, win.z]}>
        <boxGeometry args={[0.1, 0.07, win.w + 0.14]} />
        <meshStandardMaterial color={INK} roughness={0.8} />
      </mesh>
      <mesh position={[halfW - 0.06, win.y - win.h / 2 - 0.025, win.z]} castShadow>
        <boxGeometry args={[0.18, 0.05, win.w + 0.2]} />
        <meshStandardMaterial color={OAK_DARK} roughness={0.85} />
      </mesh>
      {/* sheer linen curtain on a brass rod */}
      <mesh position={[halfW - 0.28, win.y + win.h / 2 + 0.1, win.z]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.014, 0.014, win.w + 0.5, 10]} />
        <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.35} />
      </mesh>
      <SheerCurtain
        width={win.w + 0.3}
        height={win.h + 0.25}
        position={[halfW - 0.3, win.y - 0.05, win.z]}
        rotation={[0, -Math.PI / 2, 0]}
      />

      {/* arched niche: oak trim + recessed plaster panel */}
      <mesh geometry={archTrim} position={[0, 0.28, -halfD + 0.025]}>
        <meshStandardMaterial color={OAK_DARK} roughness={0.85} />
      </mesh>
      <mesh geometry={arch} position={[0, 0.35, -halfD + 0.045]} receiveShadow>
        <meshStandardMaterial color="#e0d3bc" roughness={0.97} />
      </mesh>

      {/* oak skirting + crown */}
      {[
        [0, -halfD + 0.02, ROOM.w, 0],
        [0, halfD - 0.02, ROOM.w, 0],
      ].map(([x, z, w]) => (
        <mesh key={`sk${z}`} position={[x as number, 0.05, z as number]}>
          <boxGeometry args={[w as number, 0.1, 0.035]} />
          <meshStandardMaterial color={OAK_DARK} roughness={0.88} />
        </mesh>
      ))}
      <mesh position={[-halfW + 0.02, 0.05, 0]}>
        <boxGeometry args={[0.035, 0.1, ROOM.d]} />
        <meshStandardMaterial color={OAK_DARK} roughness={0.88} />
      </mesh>
      {[-halfD + 0.015, halfD - 0.015].map((z) => (
        <mesh key={`cr${z}`} position={[0, ROOM.h - 0.05, z]}>
          <boxGeometry args={[ROOM.w, 0.1, 0.03]} />
          <meshStandardMaterial color="#ece4d4" roughness={0.95} />
        </mesh>
      ))}
    </>
  )
}

/** Hand-lettered menu board in mono — the cafe counter's quiet flex. */
function MenuBoard({
  position,
  rotation,
  accent,
}: {
  position: [number, number, number]
  rotation: [number, number, number]
  accent: string
}) {
  const texture = useCanvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#efe6d4'
    ctx.fillRect(0, 0, w, h)
    const display = resolveDisplay()
    const mono = resolveMono()
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#3a332c'
    ctx.font = `800 ${h * 0.11}px ${display}`
    ctx.fillText('TODAY', w * 0.1, h * 0.14)
    ctx.fillStyle = accent
    ctx.fillRect(w * 0.1, h * 0.22, w * 0.8, 3)
    const rows: Array<[string, string]> = [
      ['Set A · 35 puri', '35'],
      ['Set B · 70 puri', '65'],
      ['Extra puri · 20pc', '12'],
      ['Chutney duo', '8'],
    ]
    ctx.font = `500 ${h * 0.075}px ${mono}`
    rows.forEach(([name, price], i) => {
      const y = h * 0.36 + i * h * 0.16
      ctx.fillStyle = '#3a332c'
      ctx.textAlign = 'left'
      ctx.fillText(name, w * 0.1, y)
      ctx.textAlign = 'right'
      ctx.fillText(price, w * 0.9, y)
    })
    ctx.textAlign = 'left'
  }, 640, 800)

  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[0.78, 0.98, 0.035]} radius={0.015} smoothness={3} castShadow>
        <meshStandardMaterial color={OAK_DARK} roughness={0.85} />
      </RoundedBox>
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[0.7, 0.9]} />
        {texture ? (
          <meshStandardMaterial key={texture.uuid} map={texture} roughness={0.94} />
        ) : (
          <meshStandardMaterial key="plain" color="#efe6d4" roughness={0.94} />
        )}
      </mesh>
    </group>
  )
}

function resolveDisplay() {
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue('--font-bricolage')
      .split(',')[0]
      .trim() || 'sans-serif'
  )
}
function resolveMono() {
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue('--font-geist-mono')
      .split(',')[0]
      .trim() || 'monospace'
  )
}

export function ShophouseScene({ seller }: { seller: ProtoSeller }) {
  const [hero, setA, extra, sauce] = seller.products
  const accent = seller.accent
  const halfD = ROOM.d / 2

  return (
    <>
      <color attach="background" args={['#e9e0cf']} />
      <fog attach="fog" args={['#e9e0cf', 18, 34]} />
      <StudioEnvironment />
      <Lighting accent={accent} />
      <Shell accent={accent} />

      {/* the welcome: awning over the door + accent entrance mat */}
      <Awning position={[-3.2, 2.5, halfD - 0.05]} accent={accent} width={2.6} />
      <Rug width={4.8} depth={3.2} color="#e7dcc6" border="#b5764f" position={[0.3, 0.012, 0.7]} />

      {/* hero in the arch: travertine plinth + leaning frame + picture light */}
      <RoundedBox args={[0.95, 1.02, 0.55]} radius={0.04} smoothness={3} position={[0, 0.51, -3.95]} castShadow receiveShadow>
        <meshStandardMaterial color="#ddd0ba" roughness={0.8} />
      </RoundedBox>
      <FramedProduct
        product={hero}
        width={0.9}
        ratio={0.5625}
        frame={INK}
        position={[0, 1.9, -4.02]}
        lean={-0.05}
        cardY={-1.25}
        cardZ={0.62}
      />
      <group position={[0, 1.9, -4.42]}>
        <PictureLight width={0.62} y={0.82} />
        <pointLight position={[0, 0.3, 0.5]} intensity={0.7} color="#ffe7c4" distance={2.4} />
      </group>
      <PottedOlive position={[-1.85, 0, -4.0]} scale={1.1} />
      <PottedOlive position={[1.85, 0, -4.05]} scale={0.95} />

      {/* gallery row along the left wall */}
      {[
        { product: setA, z: 2.5 },
        { product: extra, z: 0.35 },
        { product: sauce, z: -1.8 },
      ].map(({ product, z }) => (
        <group key={product.id} position={[-5.9, 1.62, z]} rotation={[0, Math.PI / 2, 0]}>
          <FramedProduct product={product} width={0.95} ratio={0.72} frame={INK} lit />
        </group>
      ))}

      {/* fluted counter, back right */}
      <group position={[3.5, 0, -3.55]}>
        <RoundedBox args={[2.7, 0.92, 0.72]} radius={0.03} smoothness={3} position={[0, 0.46, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#f4eee1" roughness={0.92} />
        </RoundedBox>
        {Array.from({ length: 16 }, (_, i) => (
          <mesh key={i} position={[-1.26 + i * 0.168, 0.46, 0.37]}>
            <cylinderGeometry args={[0.035, 0.035, 0.86, 10, 1, false, -Math.PI / 2, Math.PI]} />
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
      <PendantLamp position={[2.7, ROOM.h, -3.55]} drop={0.95} />
      <PendantLamp position={[4.3, ROOM.h, -3.55]} drop={0.95} />
      <MenuBoard position={[5.55, 1.7, -2.9]} rotation={[0, -Math.PI / 2, 0]} accent={accent} />

      {/* the fascia, rope-hung from the centre beam — the terminating view */}
      <group position={[0, 2.42, -1.9]} rotation={[0, 0, 0.008]}>
        {[-0.85, 0.85].map((x) => (
          <mesh key={x} position={[x, 0.62, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 1.0, 6]} />
            <meshStandardMaterial color="#8a7a63" roughness={0.95} />
          </mesh>
        ))}
        <SignBoard
          title={seller.dropTitle}
          subtitle={seller.name}
          accent={accent}
          width={2.5}
          position={[0, 0, 0]}
        />
      </group>

      {/* quiet styling moments */}
      <Vase position={[-5.55, 0, 3.9]} scale={1.6} color="#d9cfc0" stem={false} />
      <BookStack position={[5.5, 0, 3.8]} count={4} rotation={-0.4} />

      <ContactShadows position={[0, 0.015, 0]} opacity={0.32} scale={14} blur={2.2} far={4.5} frames={1} />
    </>
  )
}
