'use client'

/**
 * PROTOTYPE VARIANT — "The Front Room"
 * A tiny home business caught between making and selling. The room is kept
 * intentionally low, sparse and slightly unfinished: one honest worktable,
 * window light from a single side, half-packed orders and three products.
 */

import { useMemo, type ReactNode } from 'react'
import { ContactShadows, Html, Image, RoundedBox } from '@react-three/drei'
import { DoubleSide, Shape } from 'three'

import type { ProtoProduct, ProtoSeller } from '../data'
import { PottedOlive, Rug, StudioEnvironment } from '../scene-kit'

const ROOM = { w: 7.2, d: 5.8, h: 2.55 }
const DARK = '#302a24'
const WOOD = '#7b5a3e'
const PAPER = '#c7a56d'

function Lighting() {
  return (
    <>
      <hemisphereLight args={['#efe4d1', '#6c5b49', 0.22]} />
      <directionalLight
        position={[-5, 4.8, 1.5]}
        intensity={3.25}
        color="#ffe7c1"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-bias={-0.0004}
      />
      <pointLight position={[2.45, 1.75, -1.85]} intensity={0.55} color="#ffc67e" distance={3.2} />
    </>
  )
}

function RoomShell() {
  const halfW = ROOM.w / 2
  const halfD = ROOM.d / 2
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM.w, ROOM.d]} />
        <meshStandardMaterial color="#8b694d" roughness={0.98} />
      </mesh>
      {Array.from({ length: 11 }, (_, index) => (
        <mesh
          key={index}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[-halfW + 0.33 + index * 0.66, 0.004, 0]}
          receiveShadow
        >
          <planeGeometry args={[0.63, ROOM.d]} />
          <meshStandardMaterial color={index % 3 === 0 ? '#79583f' : index % 2 ? '#856449' : '#8d6b4e'} roughness={1} />
        </mesh>
      ))}

      <mesh position={[0, ROOM.h / 2, -halfD]} receiveShadow>
        <planeGeometry args={[ROOM.w, ROOM.h]} />
        <meshStandardMaterial color="#d9cdb8" roughness={1} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-halfW, ROOM.h / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM.d, ROOM.h]} />
        <meshStandardMaterial color="#b36f55" roughness={1} />
      </mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[halfW, ROOM.h / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM.d, ROOM.h]} />
        <meshStandardMaterial color="#d9cdb8" roughness={1} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM.h, 0]}>
        <planeGeometry args={[ROOM.w, ROOM.d]} />
        <meshStandardMaterial color="#cfc1a9" roughness={1} />
      </mesh>

      {/* one off-frame-feeling side window, deliberately dominant */}
      <mesh position={[-halfW + 0.018, 1.45, -0.45]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.8, 1.9]} />
        <meshBasicMaterial color="#f6dfb9" toneMapped={false} />
      </mesh>
      {[-0.9, 0.9].map((z) => (
        <mesh key={z} position={[-halfW + 0.025, 1.45, -0.45 + z]}>
          <boxGeometry args={[0.06, 1.9, 0.055]} />
          <meshStandardMaterial color={DARK} roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[-halfW + 0.02, 1.45, -0.45]}>
        <boxGeometry args={[0.06, 0.055, 1.8]} />
        <meshStandardMaterial color={DARK} roughness={0.9} />
      </mesh>
      <mesh position={[-halfW + 0.02, 0.53, -0.45]}>
        <boxGeometry args={[0.16, 0.07, 2.0]} />
        <meshStandardMaterial color={WOOD} roughness={0.92} />
      </mesh>

      {/* chalky skirting, not pristine */}
      <mesh position={[0, 0.055, -halfD + 0.025]}>
        <boxGeometry args={[ROOM.w, 0.11, 0.05]} />
        <meshStandardMaterial color="#c8baa4" roughness={1} />
      </mesh>
    </>
  )
}

function ProductLabel({ product }: { product: ProtoProduct }) {
  const stock = product.soldOut
    ? 'gone'
    : product.left === null
      ? null
      : `${product.left} left`
  return (
    <Html center position={[0, 0.01, 0.08]} transform distanceFactor={1.45}>
      <div
        className="w-[104px] border border-[#302a24]/20 bg-[#e8dfcf] px-2 py-1.5 text-left text-[#302a24] shadow-sm"
        style={{ transform: 'rotate(-1deg)' }}
      >
        <p className="line-clamp-2 font-display text-[8px] font-bold leading-[1.05]">{product.name}</p>
        {product.variant && <p className="mt-0.5 truncate text-[6px] text-[#746b5c]">{product.variant}</p>}
        <div className="mt-1 flex items-center justify-between gap-1 font-mono text-[6px]">
          <span>${product.price}</span>
          {stock && <span className={product.soldOut ? 'font-bold uppercase' : 'text-[#66705e]'}>{stock}</span>}
        </div>
      </div>
    </Html>
  )
}

function TableProduct({ product }: { product: ProtoProduct }) {
  return (
    <group>
      <mesh position={[0, 0.38, -0.015]} rotation={[0.025, 0, 0]} castShadow>
        <boxGeometry args={[0.62, 0.76, 0.035]} />
        <meshStandardMaterial color="#d9ccb4" roughness={0.96} />
      </mesh>
      {/* Drei renders this texture inside WebGL rather than as a DOM image. */}
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <Image
        url={product.image}
        position={[0, 0.42, 0.01]}
        scale={[0.54, 0.58]}
        transparent
      />
      <mesh position={[0, 0.035, -0.04]} castShadow>
        <boxGeometry args={[0.7, 0.07, 0.24]} />
        <meshStandardMaterial color="#69503b" roughness={0.9} />
      </mesh>
      <ProductLabel product={product} />
    </group>
  )
}

function WorkTable({ seller }: { seller: ProtoSeller }) {
  return (
    <group position={[-0.25, 0, -0.25]} rotation={[0, -0.06, 0]}>
      {/* visible, imperfect timber grain */}
      <RoundedBox args={[3.4, 0.14, 1.45]} radius={0.025} smoothness={2} position={[0, 0.88, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={WOOD} roughness={0.9} />
      </RoundedBox>
      {[-1.48, 1.48].flatMap((x) => [-0.55, 0.55].map((z) => (
        <mesh key={`${x}-${z}`} position={[x, 0.43, z]} rotation={[0, 0, x * 0.012]} castShadow>
          <boxGeometry args={[0.1, 0.86, 0.1]} />
          <meshStandardMaterial color="#60432f" roughness={0.96} />
        </mesh>
      )))}
      {[[-1.16, -0.3], [-0.53, -0.2], [0.1, -0.08]].map(([x, z], index) => (
        <group key={`${seller.products[index].id}-${index}`} position={[x, 0.96, z]} rotation={[0, index * 0.08 - 0.08, index * 0.015 - 0.01]}>
          <TableProduct product={seller.products[index]} />
        </group>
      ))}

      {/* paper order slips and twine: making is still happening here */}
      <mesh position={[0.72, 0.965, 0.12]} rotation={[-Math.PI / 2, 0, -0.12]} castShadow>
        <planeGeometry args={[0.62, 0.42]} />
        <meshStandardMaterial color="#d7c7a9" roughness={1} side={DoubleSide} />
      </mesh>
      <mesh position={[0.72, 0.97, 0.12]} rotation={[-Math.PI / 2, 0, -0.12]}>
        <planeGeometry args={[0.015, 0.68]} />
        <meshStandardMaterial color="#725a43" roughness={1} side={DoubleSide} />
      </mesh>
      <Mug position={[1.08, 0.96, -0.31]} />
      <TapeDispenser position={[1.22, 0.96, 0.3]} />
    </group>
  )
}

function Mug({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0, -0.25, 0]}>
      <mesh position={[0, 0.11, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.075, 0.22, 20, 1, true]} />
        <meshStandardMaterial color="#7f8973" roughness={0.9} side={DoubleSide} />
      </mesh>
      <mesh position={[0.1, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.055, 0.014, 8, 16]} />
        <meshStandardMaterial color="#7f8973" roughness={0.9} />
      </mesh>
    </group>
  )
}

function TapeDispenser({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0, -0.4, 0]}>
      <RoundedBox args={[0.34, 0.1, 0.16]} radius={0.035} smoothness={2} position={[0, 0.05, 0]} castShadow>
        <meshStandardMaterial color={DARK} roughness={0.88} />
      </RoundedBox>
      <mesh position={[-0.04, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.06, 0.02, 10, 18]} />
        <meshStandardMaterial color="#d5bd86" roughness={0.65} />
      </mesh>
    </group>
  )
}

function PackingCorner() {
  return (
    <group position={[2.55, 0, -2.18]} rotation={[0, -0.16, 0]}>
      {[
        { p: [0, 0.22, 0] as const, s: [0.72, 0.44, 0.58] as const },
        { p: [0.16, 0.62, -0.05] as const, s: [0.58, 0.36, 0.46] as const },
        { p: [-0.4, 0.14, 0.18] as const, s: [0.45, 0.28, 0.38] as const },
      ].map((box, index) => (
        <group key={index} position={box.p} rotation={[0, index * 0.16, index === 1 ? -0.04 : 0]}>
          <mesh castShadow>
            <boxGeometry args={box.s} />
            <meshStandardMaterial color={PAPER} roughness={0.98} />
          </mesh>
          <mesh position={[0, box.s[1] / 2 + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.055, box.s[2]]} />
            <meshStandardMaterial color="#9b7d50" roughness={1} />
          </mesh>
        </group>
      ))}
      <mesh position={[-0.02, 0.86, 0.2]} rotation={[-0.1, 0, -0.12]}>
        <planeGeometry args={[0.38, 0.24]} />
        <meshStandardMaterial color="#e5d6b8" roughness={1} side={DoubleSide} />
      </mesh>
    </group>
  )
}

function HandwrittenNote({ seller }: { seller: ProtoSeller }) {
  return (
    <group position={[0.65, 1.7, -ROOM.d / 2 + 0.035]} rotation={[0, 0, 0.025]}>
      <Html transform center distanceFactor={2.2} position={[0, 0, 0.02]}>
        <div className="relative w-[210px] rotate-[-1deg] bg-[#d6c499] px-5 py-5 text-center text-[#393129] shadow-[2px_3px_7px_rgba(48,42,36,.18)]">
          <span className="absolute -top-2 left-1/2 h-4 w-16 -translate-x-1/2 rotate-[-2deg] bg-[#c6b17a]/75" />
          <p className="font-serif text-[17px] italic leading-tight">I’ll be right back —</p>
          <p className="mt-1 font-serif text-[13px] italic">have a little look around</p>
          <p className="mt-3 text-right font-serif text-[10px] text-[#6e745e]">— {seller.name.toLowerCase()}</p>
        </div>
      </Html>
    </group>
  )
}

function GarmentRail() {
  const garment = useMemo(() => {
    const shape = new Shape()
    shape.moveTo(-0.16, 0.5)
    shape.quadraticCurveTo(0, 0.35, 0.16, 0.5)
    shape.lineTo(0.37, 0.4)
    shape.lineTo(0.3, -0.52)
    shape.quadraticCurveTo(0.08, -0.58, -0.06, -0.53)
    shape.quadraticCurveTo(-0.22, -0.48, -0.34, -0.56)
    shape.lineTo(-0.38, 0.4)
    shape.closePath()
    return shape
  }, [])
  return (
    <group position={[2.72, 0, 0.34]}>
      {[-0.45, 0.45].map((x) => (
        <mesh key={x} position={[x, 0.88, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 1.76, 10]} />
          <meshStandardMaterial color={DARK} roughness={0.82} />
        </mesh>
      ))}
      <mesh position={[0, 1.74, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.018, 0.018, 0.94, 10]} />
        <meshStandardMaterial color={DARK} roughness={0.82} />
      </mesh>
      <mesh position={[0, 1.55, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.22, 0.012, 6, 18, Math.PI]} />
        <meshStandardMaterial color="#6b4d36" roughness={0.9} />
      </mesh>
      {/* a single soft, asymmetrical garment */}
      <mesh position={[0, 1.03, 0.015]} castShadow>
        <shapeGeometry args={[garment, 8]} />
        <meshStandardMaterial color="#88907a" roughness={1} side={DoubleSide} />
      </mesh>
      <mesh position={[-0.39, 1.25, 0]} rotation={[0, 0, -0.5]} castShadow>
        <planeGeometry args={[0.18, 0.52]} />
        <meshStandardMaterial color="#88907a" roughness={1} side={DoubleSide} />
      </mesh>
      <mesh position={[0.39, 1.25, 0]} rotation={[0, 0, 0.46]} castShadow>
        <planeGeometry args={[0.18, 0.5]} />
        <meshStandardMaterial color="#88907a" roughness={1} side={DoubleSide} />
      </mesh>
      {[-0.16, 0.11].map((x) => (
        <mesh key={x} position={[x, 0.99, 0.023]} rotation={[0, 0, x * 0.08]}>
          <planeGeometry args={[0.012, 0.78]} />
          <meshBasicMaterial color="#68705e" transparent opacity={0.28} />
        </mesh>
      ))}
    </group>
  )
}

function TableLamp() {
  return (
    <group position={[2.65, 0.83, -1.78]}>
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.025, 0.08, 0.56, 12]} />
        <meshStandardMaterial color={DARK} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.63, 0]}>
        <cylinderGeometry args={[0.14, 0.25, 0.3, 20, 1, true]} />
        <meshStandardMaterial color="#c5a97d" roughness={1} side={DoubleSide} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.055, 12, 12]} />
        <meshBasicMaterial color="#ffd59d" toneMapped={false} />
      </mesh>
    </group>
  )
}

type StationKind = 'bench' | 'dresser' | 'packing' | 'serving'

function ProductStation({
  label,
  products,
  kind,
  position,
  rotation = [0, 0, 0],
}: {
  label: string
  products: ProtoProduct[]
  kind: StationKind
  position: [number, number, number]
  rotation?: [number, number, number]
}) {
  const width = products.length >= 3 ? 2.45 : products.length === 2 ? 1.75 : 1.12
  const height = kind === 'bench' ? 0.46 : kind === 'dresser' || kind === 'serving' ? 0.72 : 0.82
  const depth = kind === 'bench' ? 0.62 : 0.54
  const step = products.length === 1 ? 0 : 0.76

  return (
    <group position={position} rotation={rotation}>
      <RoundedBox
        args={[width, kind === 'packing' ? 0.12 : 0.42, depth]}
        radius={0.035}
        smoothness={2}
        position={[0, kind === 'packing' ? height : height - 0.2, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={kind === 'packing' ? WOOD : kind === 'bench' ? '#a88b68' : kind === 'serving' ? '#a77b52' : '#8a684a'}
          roughness={0.94}
        />
      </RoundedBox>

      {(kind === 'dresser' || kind === 'serving') && [-width / 4, width / 4].map((x) => (
        <mesh key={x} position={[x, height - 0.18, depth / 2 + 0.012]}>
          <planeGeometry args={[width / 2 - 0.05, 0.28]} />
          <meshStandardMaterial color="#745239" roughness={0.95} />
        </mesh>
      ))}

      {[-width / 2 + 0.13, width / 2 - 0.13].flatMap((x) => [-depth / 2 + 0.1, depth / 2 - 0.1].map((z) => (
        <mesh key={`${x}-${z}`} position={[x, height / 2 - 0.05, z]} castShadow>
          <boxGeometry args={[0.075, Math.max(0.15, height - 0.12), 0.075]} />
          <meshStandardMaterial color="#5f4431" roughness={0.98} />
        </mesh>
      )))}

      {products.map((product, index) => (
        <group
          key={`${product.id}-${index}`}
          position={[(index - (products.length - 1) / 2) * step, height + 0.07, 0]}
          rotation={[0, (index - 1) * 0.045, (index - 1) * 0.012]}
        >
          <TableProduct product={product} />
        </group>
      ))}

      {kind === 'serving' && products.map((product, index) => (
        <group key={`plate-${product.id}-${index}`} position={[(index - (products.length - 1) / 2) * step, height + 0.055, -0.18]}>
          <mesh scale={[1.35, 1, 0.7]} castShadow>
            <cylinderGeometry args={[0.18, 0.2, 0.025, 24]} />
            <meshStandardMaterial color="#d9c9ad" roughness={0.86} />
          </mesh>
          <mesh position={[0, 0.06, 0]} scale={[1.3, 0.7, 0.8]}>
            <sphereGeometry args={[0.12, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#c7a36e" roughness={0.92} />
          </mesh>
        </group>
      ))}

      <Html center transform distanceFactor={2.6} position={[0, height + 1.02, -0.03]}>
        <div className="whitespace-nowrap border border-[#302a24]/15 bg-[#d9c79e] px-3 py-1.5 font-serif text-[11px] italic text-[#3d342b] shadow-sm">
          {label}
        </div>
      </Html>

      {kind === 'packing' && (
        <>
          <mesh position={[0, 0.36, 0]} castShadow>
            <boxGeometry args={[width - 0.2, 0.07, depth - 0.04]} />
            <meshStandardMaterial color="#725039" roughness={0.96} />
          </mesh>
          <Mug position={[width / 2 - 0.2, height + 0.07, -0.18]} />
        </>
      )}
    </group>
  )
}

function CircuitRoomBase({ children }: { children: ReactNode }) {
  return (
    <>
      <color attach="background" args={['#cbbda6']} />
      <fog attach="fog" args={['#cbbda6', 11, 21]} />
      <StudioEnvironment tint="#eadcc5" />
      <Lighting />
      <RoomShell />
      <Rug width={4.15} depth={2.65} color="#b3a68e" border="#746b59" position={[-0.1, 0.012, 0.45]} />
      {children}
      <PottedOlive position={[-2.8, 0, -2.18]} scale={0.72} />
      <ContactShadows position={[0, 0.015, 0]} opacity={0.36} scale={9} blur={2.2} far={3.5} frames={1} />
    </>
  )
}

function pickProducts(seller: ProtoSeller, indexes: number[]) {
  return indexes.map((index) => seller.products[index % seller.products.length])
}

/** Variation A: two higher-capacity stations, like a working home shop. */
export function DomesticCircuitScene({ seller }: { seller: ProtoSeller }) {
  return (
    <CircuitRoomBase>
      <ProductStation
        label="wearables · try a closer look"
        products={pickProducts(seller, [0, 1, 2])}
        kind="bench"
        position={[-3.15, 0, -0.35]}
        rotation={[0, Math.PI / 2, 0]}
      />
      <ProductStation
        label="desk things · packed here"
        products={pickProducts(seller, [3, 4])}
        kind="packing"
        position={[0.95, 0, -2.48]}
      />
      <PackingCorner />
      <TableLamp />
    </CircuitRoomBase>
  )
}

/** Variation B: three smaller stations make a complete perimeter loop. */
export function DomesticLoopScene({ seller }: { seller: ProtoSeller }) {
  if (seller.vertical === 'fnb') {
    return (
      <CircuitRoomBase>
        <ProductStation
          label="tonight’s supper sets"
          products={pickProducts(seller, [0, 1])}
          kind="serving"
          position={[-0.55, 0, -2.48]}
        />
        <ProductStation
          label="drinks & extras"
          products={pickProducts(seller, [2])}
          kind="packing"
          position={[-3.15, 0, -0.35]}
          rotation={[0, Math.PI / 2, 0]}
        />
        <PackingCorner />
        <TableLamp />
        <HandwrittenNote seller={seller} />
      </CircuitRoomBase>
    )
  }

  return (
    <CircuitRoomBase>
      <ProductStation
        label="by the window"
        products={pickProducts(seller, [0, 1])}
        kind="bench"
        position={[-3.15, 0, -0.35]}
        rotation={[0, Math.PI / 2, 0]}
      />
      <ProductStation
        label="the new pieces"
        products={pickProducts(seller, [2, 3])}
        kind="dresser"
        position={[-0.45, 0, -2.48]}
      />
      <ProductStation
        label="small things"
        products={pickProducts(seller, [4])}
        kind="packing"
        position={[2.8, 0, -0.15]}
        rotation={[0, -Math.PI / 2, 0]}
      />
      <PackingCorner />
      <HandwrittenNote seller={seller} />
    </CircuitRoomBase>
  )
}

export function FrontRoomScene({ seller }: { seller: ProtoSeller }) {
  return (
    <>
      <color attach="background" args={['#cbbda6']} />
      <fog attach="fog" args={['#cbbda6', 11, 21]} />
      <StudioEnvironment tint="#eadcc5" />
      <Lighting />
      <RoomShell />
      <Rug width={4.4} depth={2.8} color="#b3a68e" border="#746b59" position={[-0.35, 0.012, 0.25]} />
      <WorkTable seller={seller} />
      <PackingCorner />
      <HandwrittenNote seller={seller} />
      <GarmentRail />
      <TableLamp />
      <PottedOlive position={[-2.78, 0, -2.12]} scale={0.76} />
      <ContactShadows position={[0, 0.015, 0]} opacity={0.36} scale={9} blur={2.2} far={3.5} frames={1} />
    </>
  )
}
