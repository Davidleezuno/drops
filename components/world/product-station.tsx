'use client'

import { Html, RoundedBox } from '@react-three/drei'

import type { Product } from '@/lib/types'
import type { Announcement } from '@/lib/use-drop-social'
import type { SceneStation } from '@/lib/world/scene-config'

import { ProductFrame } from './product-frame'
import { BRASS, OAK_DARK } from './shophouse-decor'

const OAK = '#9b704f'
const OAT = '#d8c6aa'
const CLAY = '#a96850'
const SAGE = '#76836a'
const KRAFT = '#a97b4f'

function Table({ width, serving }: { width: number; serving?: boolean }) {
  return (
    <group>
      <RoundedBox
        args={[width, 0.12, 0.82]}
        radius={0.035}
        smoothness={3}
        position={[0, 0.78, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={OAK} roughness={0.91} />
      </RoundedBox>
      {[-width / 2 + 0.18, width / 2 - 0.18].flatMap((x) =>
        [-0.26, 0.26].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.38, z]} castShadow>
            <boxGeometry args={[0.1, 0.76, 0.1]} />
            <meshStandardMaterial color={OAK_DARK} roughness={0.9} />
          </mesh>
        )),
      )}
      {serving && (
        <mesh position={[0, 0.86, 0]} receiveShadow>
          <boxGeometry args={[width - 0.28, 0.035, 0.65]} />
          <meshStandardMaterial color={OAT} roughness={0.96} />
        </mesh>
      )}
    </group>
  )
}

function Dresser({ width }: { width: number }) {
  return (
    <group>
      <RoundedBox
        args={[width, 0.78, 0.64]}
        radius={0.04}
        smoothness={3}
        position={[0, 0.44, 0.04]}
        castShadow
      >
        <meshStandardMaterial color={OAT} roughness={0.94} />
      </RoundedBox>
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[width + 0.12, 0.07, 0.76]} />
        <meshStandardMaterial color={OAK} roughness={0.9} />
      </mesh>
      {[-0.22, 0.22].map((y) => (
        <group key={y} position={[0, 0.48 + y, 0.365]}>
          <mesh>
            <boxGeometry args={[width - 0.2, 0.31, 0.025]} />
            <meshStandardMaterial color="#cbb795" roughness={0.96} />
          </mesh>
          <mesh position={[0, 0, 0.03]}>
            <sphereGeometry args={[0.035, 10, 10]} />
            <meshStandardMaterial color={BRASS} metalness={0.4} roughness={0.55} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Bench({ width }: { width: number }) {
  return (
    <group>
      <RoundedBox
        args={[width, 0.3, 0.75]}
        radius={0.09}
        smoothness={4}
        position={[0, 0.62, 0]}
        castShadow
      >
        <meshStandardMaterial color={SAGE} roughness={0.98} />
      </RoundedBox>
      {[-width / 2 + 0.22, width / 2 - 0.22].map((x) => (
        <mesh key={x} position={[x, 0.29, 0]} castShadow>
          <boxGeometry args={[0.12, 0.58, 0.55]} />
          <meshStandardMaterial color={OAK_DARK} roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

function Rail({ width }: { width: number }) {
  return (
    <group>
      <Bench width={width} />
      {[-width / 2 + 0.12, width / 2 - 0.12].map((x) => (
        <mesh key={x} position={[x, 1.45, -0.24]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 1.75, 10]} />
          <meshStandardMaterial color={OAK_DARK} roughness={0.78} />
        </mesh>
      ))}
      <mesh position={[0, 2.3, -0.24]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.03, width, 12]} />
        <meshStandardMaterial color={BRASS} metalness={0.55} roughness={0.48} />
      </mesh>
    </group>
  )
}

function PackingCounter({ width }: { width: number }) {
  return (
    <group>
      <Table width={width} />
      <group position={[width / 2 - 0.32, 0.98, -0.16]}>
        {[0, 0.14].map((y, index) => (
          <mesh key={y} position={[0, y, 0]} castShadow>
            <boxGeometry args={[0.48 - index * 0.06, 0.13, 0.38]} />
            <meshStandardMaterial color={KRAFT} roughness={1} />
          </mesh>
        ))}
      </group>
      <mesh position={[-width / 2 + 0.3, 0.98, -0.12]} castShadow>
        <cylinderGeometry args={[0.12, 0.1, 0.22, 18]} />
        <meshStandardMaterial color={CLAY} roughness={0.94} />
      </mesh>
      <mesh position={[-width / 2 + 0.44, 1.01, -0.12]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.08, 0.022, 8, 16]} />
        <meshStandardMaterial color={CLAY} roughness={0.94} />
      </mesh>
    </group>
  )
}

function StationFurniture({ kind, width }: Pick<SceneStation, 'kind'> & { width: number }) {
  if (kind === 'serving') return <Table width={width} serving />
  if (kind === 'dresser') return <Dresser width={width} />
  if (kind === 'bench') return <Bench width={width} />
  if (kind === 'rail') return <Rail width={width} />
  return <PackingCounter width={width} />
}

export function ProductStation({
  station,
  productsById,
  accent,
  disabled,
  announcement,
  onSelect,
}: {
  station: SceneStation
  productsById: Map<string, Product>
  accent: string
  disabled: boolean
  announcement: Announcement | null
  onSelect: (product: Product) => void
}) {
  const products = station.slots.flatMap((slot) => {
    const product = productsById.get(slot.productId)
    return product ? [{ product, slot }] : []
  })
  const width = Math.max(1.7, products.length * 1.05 + 0.55)

  return (
    <group>
      <StationFurniture kind={station.kind} width={width} />
      {products.map(({ product, slot }, index) => {
        const x = (index - (products.length - 1) / 2) * 1.05
        const lean = (index - (products.length - 1) / 2) * -0.035
        return (
          <group
            key={product.id}
            position={[x, station.kind === 'rail' ? 1.42 : 1.48, 0.08]}
            rotation={[0, lean, 0]}
            scale={0.56}
          >
            <ProductFrame
              product={product}
              imageUrl={slot.imageUrl}
              accent={accent}
              disabled={disabled}
              sparkleId={
                announcement &&
                announcement.kind !== 'summary' &&
                announcement.productName === product.name
                  ? announcement.id
                  : undefined
              }
              onSelect={onSelect}
            />
          </group>
        )
      })}
      <Html center position={[-width / 2 + 0.35, 0.18, 0.44]} distanceFactor={6}>
        <div className="pointer-events-none -rotate-2 whitespace-nowrap rounded-sm bg-[#3f392f] px-2 py-1 font-serif text-[9px] italic tracking-wide text-[#eee3cc] shadow-sm">
          {station.kind === 'serving'
            ? 'made today'
            : station.kind === 'rail'
              ? 'small run'
              : station.kind === 'packing'
                ? 'packed by hand'
                : 'chosen for this drop'}
        </div>
      </Html>
    </group>
  )
}
