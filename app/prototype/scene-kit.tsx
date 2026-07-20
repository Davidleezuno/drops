'use client'

/**
 * PROTOTYPE — throwaway shared scene kit for the /prototype storefront
 * explorations. Everything here is about one goal: rooms that read as
 * interior-designed rather than "three.js demo". Matte materials, honest
 * daylight, brass/ceramic/oak props, real typography on canvas textures.
 */

import { Environment, Html, Lightformer, RoundedBox, useTexture } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CanvasTexture,
  DoubleSide,
  LatheGeometry,
  Object3D,
  PlaneGeometry,
  SpotLight,
  SRGBColorSpace,
  Vector2,
} from 'three'

import { sgd } from '@/lib/format'

import type { ProtoProduct } from './data'

export const INK = '#2d2925'
export const BRASS = '#b08d57'
export const OAK = '#b08d5f'
export const OAK_DARK = '#74563a'
export const MATBOARD = '#f8f3ea'
export const PLASTER = '#f2ebdf'

/* ------------------------------------------------------------------ */
/* texture helpers                                                     */
/* ------------------------------------------------------------------ */

/** Cover-crop an image into a frame window of `ratio` (w/h). */
function useCoverTexture(url: string, ratio: number) {
  const source = useTexture(url)
  return useMemo(() => {
    const texture = source.clone()
    const image = source.image as { width: number; height: number }
    const imageRatio = image.width / image.height
    if (imageRatio > ratio) {
      const repeat = ratio / imageRatio
      texture.repeat.set(repeat, 1)
      texture.offset.set((1 - repeat) / 2, 0)
    } else {
      const repeat = imageRatio / ratio
      texture.repeat.set(1, repeat)
      texture.offset.set(0, (1 - repeat) / 2)
    }
    texture.colorSpace = SRGBColorSpace
    texture.needsUpdate = true
    return texture
  }, [source, ratio])
}

function resolveFontFamily(cssVar: string, fallback: string) {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(cssVar)
    .split(',')[0]
    .trim()
  return value || fallback
}

/** Draw into a canvas once webfonts are ready; returns a CanvasTexture. */
export function useCanvasTexture(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  width = 1024,
  height = 512,
) {
  const [texture, setTexture] = useState<CanvasTexture | null>(null)
  useEffect(() => {
    let cancelled = false
    document.fonts.ready.then(() => {
      if (cancelled) return
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      draw(ctx, width, height)
      const tex = new CanvasTexture(canvas)
      tex.colorSpace = SRGBColorSpace
      tex.anisotropy = 8
      setTexture(tex)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return texture
}

/* ------------------------------------------------------------------ */
/* typography on wood — the fascia sign                                */
/* ------------------------------------------------------------------ */

export function SignBoard({
  title,
  subtitle,
  accent,
  width = 2.6,
  position,
  rotation,
  board = '#6f5138',
  ink = '#f7f0e2',
}: {
  title: string
  subtitle: string
  accent: string
  width?: number
  position: [number, number, number]
  rotation?: [number, number, number]
  board?: string
  ink?: string
}) {
  const height = width * 0.34
  const texture = useCanvasTexture((ctx, w, h) => {
    ctx.fillStyle = board
    ctx.fillRect(0, 0, w, h)
    // whisper of wood grain
    ctx.globalAlpha = 0.08
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = i % 2 ? '#000' : '#fff'
      const y = (h / 26) * i + Math.sin(i * 1.7) * 6
      ctx.fillRect(0, y, w, 2.5)
    }
    ctx.globalAlpha = 1
    const display = resolveFontFamily('--font-bricolage', 'sans-serif')
    const sans = resolveFontFamily('--font-instrument', 'sans-serif')
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = ink
    let titleSize = title.length > 18 ? h * 0.34 : h * 0.42
    ctx.font = `800 ${titleSize}px ${display}`
    while (ctx.measureText(title).width > w * 0.84 && titleSize > 12) {
      titleSize *= 0.93
      ctx.font = `800 ${titleSize}px ${display}`
    }
    ctx.fillText(title, w / 2, h * 0.42)
    ctx.fillStyle = accent
    ctx.fillRect(w / 2 - w * 0.09, h * 0.66, w * 0.18, h * 0.02)
    ctx.fillStyle = ink
    ctx.globalAlpha = 0.85
    const sub = subtitle.toUpperCase()
    let subSize = h * 0.13
    let spacing = h * 0.045
    const setSubFont = () => {
      ctx.font = `500 ${subSize}px ${sans}`
      ctx.letterSpacing = `${spacing}px`
    }
    setSubFont()
    // measureText ignores letterSpacing; add it per glyph
    while (
      ctx.measureText(sub).width + spacing * sub.length > w * 0.86 &&
      subSize > 8
    ) {
      subSize *= 0.93
      spacing *= 0.88
      setSubFont()
    }
    ctx.fillText(sub, w / 2, h * 0.83)
  })

  return (
    <group position={position} rotation={rotation}>
      {/* slim accent rim — the one painted moment */}
      <mesh position={[0, 0, -0.012]}>
        <boxGeometry args={[width + 0.06, height + 0.06, 0.03]} />
        <meshStandardMaterial color={accent} roughness={0.7} />
      </mesh>
      <mesh castShadow>
        <boxGeometry args={[width, height, 0.045]} />
        {texture ? (
          <meshStandardMaterial key={texture.uuid} map={texture} roughness={0.85} />
        ) : (
          <meshStandardMaterial key="plain" color={board} roughness={0.85} />
        )}
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* framed product — the heart of every variant                         */
/* ------------------------------------------------------------------ */

export function PriceCard({
  product,
  y,
  z = 0.06,
}: {
  product: ProtoProduct
  y: number
  z?: number
}) {
  const low = product.left !== null && product.left > 0 && product.left <= 3
  return (
    <Html center position={[0, y, z]} distanceFactor={4.5} zIndexRange={[20, 0]}>
      <div className="pointer-events-none w-40 rounded-xl border border-black/10 bg-white/95 px-3 py-2 text-[#2d2925] shadow-sm">
        <p className="truncate text-xs font-semibold">{product.name}</p>
        <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[10px] tabular-nums">
          <span>{sgd.format(product.price)}</span>
          {product.soldOut ? (
            <span className="-rotate-2 rounded-full bg-[#2d2925] px-2 py-0.5 font-bold tracking-widest text-white">
              GONE
            </span>
          ) : low ? (
            <span className="rounded-full bg-[#fff0cd] px-2 py-0.5 font-semibold text-[#8a5b14]">
              {product.left} left
            </span>
          ) : product.left !== null ? (
            <span className="text-[#706a63]">{product.left} left</span>
          ) : null}
        </div>
      </div>
    </Html>
  )
}

/** Brass gallery picture light: bar + real spotlight, aimed at the art. */
export function PictureLight({
  width,
  y,
  color = '#ffe7c4',
}: {
  width: number
  y: number
  color?: string
}) {
  const light = useRef<SpotLight>(null)
  const target = useMemo(() => new Object3D(), [])
  useEffect(() => {
    if (light.current) light.current.target = target
  }, [target])
  return (
    <group position={[0, y, 0]}>
      <mesh position={[0, 0.02, 0.1]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.016, 0.016, width, 12]} />
        <meshStandardMaterial color={BRASS} metalness={0.85} roughness={0.35} />
      </mesh>
      {[-width / 2 + 0.03, width / 2 - 0.03].map((x) => (
        <mesh key={x} position={[x, -0.01, 0.05]} rotation={[Math.PI / 3, 0, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.12, 8]} />
          <meshStandardMaterial color={BRASS} metalness={0.85} roughness={0.35} />
        </mesh>
      ))}
      <primitive object={target} position={[0, -y + 0.02, 0.02]} />
      <spotLight
        ref={light}
        position={[0, 0.05, 0.22]}
        intensity={9}
        angle={0.6}
        penumbra={0.85}
        distance={3.4}
        color={color}
      />
    </group>
  )
}

export function FramedProduct({
  product,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 0.92,
  ratio = 0.72,
  frame = INK,
  lit = false,
  lean = 0,
  cardY,
  cardZ = 0.06,
}: {
  product: ProtoProduct
  position?: [number, number, number]
  rotation?: [number, number, number]
  width?: number
  ratio?: number
  frame?: string
  lit?: boolean
  lean?: number
  cardY?: number
  cardZ?: number
}) {
  const imageH = width / ratio
  const texture = useCoverTexture(product.image, ratio)
  const soldOut = !!product.soldOut

  return (
    <group position={position} rotation={rotation}>
      <group rotation={[lean, 0, 0]}>
        <RoundedBox
          args={[width + 0.22, imageH + 0.22, 0.055]}
          radius={0.02}
          smoothness={3}
          castShadow
        >
          <meshStandardMaterial color={frame} roughness={0.72} />
        </RoundedBox>
        {/* cream back panel — frame backs are visible from half the room */}
        <mesh position={[0, 0, -0.029]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[width + 0.12, imageH + 0.12]} />
          <meshStandardMaterial color={MATBOARD} roughness={0.94} />
        </mesh>
        <mesh position={[0, 0, 0.029]}>
          <planeGeometry args={[width + 0.12, imageH + 0.12]} />
          <meshStandardMaterial color={MATBOARD} roughness={0.94} />
        </mesh>
        <mesh position={[0, 0, 0.033]}>
          <planeGeometry args={[width, imageH]} />
          <meshStandardMaterial
            map={texture}
            roughness={0.9}
            color={soldOut ? '#8f8a83' : '#ffffff'}
          />
        </mesh>
        {lit && <PictureLight width={width * 0.66} y={imageH / 2 + 0.24} />}
      </group>
      <PriceCard product={product} y={cardY ?? -(imageH / 2 + 0.42)} z={cardZ} />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* interior-design props                                               */
/* ------------------------------------------------------------------ */

export function Rug({
  width,
  depth,
  color,
  border,
  position,
}: {
  width: number
  depth: number
  color: string
  border: string
  position: [number, number, number]
}) {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={border} roughness={0.98} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} receiveShadow>
        <planeGeometry args={[width - 0.28, depth - 0.28]} />
        <meshStandardMaterial color={color} roughness={0.98} />
      </mesh>
    </group>
  )
}

const BOOK_COLORS = ['#a89680', '#7d8b74', '#b98d6e', '#8b7f92', '#c0a878']

export function BookStack({
  position,
  count = 3,
  rotation = 0,
}: {
  position: [number, number, number]
  count?: number
  rotation?: number
}) {
  const books = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        w: 0.24 + ((i * 37) % 10) / 100,
        h: 0.028 + ((i * 13) % 8) / 1000,
        d: 0.17 + ((i * 23) % 6) / 100,
        rot: (((i * 41) % 14) - 7) / 100,
        color: BOOK_COLORS[i % BOOK_COLORS.length],
      })),
    [count],
  )
  let y = 0
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {books.map((book, i) => {
        y += book.h / 2
        const el = (
          <mesh key={i} position={[0, y, 0]} rotation={[0, book.rot, 0]} castShadow>
            <boxGeometry args={[book.w, book.h, book.d]} />
            <meshStandardMaterial color={book.color} roughness={0.92} />
          </mesh>
        )
        y += book.h / 2
        return el
      })}
    </group>
  )
}

/** Lathe-turned ceramic vase — the curved profile does the realism work. */
export function Vase({
  position,
  scale = 1,
  color = '#e8e0d2',
  stem = true,
}: {
  position: [number, number, number]
  scale?: number
  color?: string
  stem?: boolean
}) {
  const geometry = useMemo(() => {
    const points = [
      new Vector2(0.001, 0),
      new Vector2(0.055, 0.005),
      new Vector2(0.075, 0.05),
      new Vector2(0.082, 0.11),
      new Vector2(0.06, 0.18),
      new Vector2(0.038, 0.22),
      new Vector2(0.042, 0.25),
      new Vector2(0.05, 0.26),
    ]
    return new LatheGeometry(points, 24)
  }, [])
  return (
    <group position={position} scale={scale}>
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
      {stem && (
        <>
          <mesh position={[0.01, 0.33, 0]} rotation={[0, 0, 0.12]}>
            <cylinderGeometry args={[0.004, 0.005, 0.16, 6]} />
            <meshStandardMaterial color="#7c6a4f" roughness={0.95} />
          </mesh>
          <mesh position={[0.03, 0.42, 0]}>
            <sphereGeometry args={[0.028, 10, 10]} />
            <meshStandardMaterial color="#a5947a" roughness={0.95} />
          </mesh>
        </>
      )}
    </group>
  )
}

/** A proper olive tree: tapered terracotta pot, gnarled trunk, dusty foliage. */
export function PottedOlive({
  position,
  scale = 1,
}: {
  position: [number, number, number]
  scale?: number
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.15, 0.4, 20]} />
        <meshStandardMaterial color="#b0764f" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.41, 0]}>
        <cylinderGeometry args={[0.21, 0.21, 0.035, 20]} />
        <meshStandardMaterial color="#a06a45" roughness={0.9} />
      </mesh>
      <mesh position={[0.02, 0.85, 0]} rotation={[0, 0, 0.06]} castShadow>
        <cylinderGeometry args={[0.022, 0.038, 0.9, 8]} />
        <meshStandardMaterial color="#6d5a44" roughness={0.95} />
      </mesh>
      {[
        [0, 1.5, 0, 0.34],
        [0.26, 1.34, 0.1, 0.24],
        [-0.24, 1.4, -0.08, 0.22],
        [0.05, 1.28, -0.22, 0.18],
      ].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} scale={[1, 0.82, 1]} castShadow>
          <sphereGeometry args={[r, 18, 14]} />
          <meshStandardMaterial color={i % 2 ? '#8a9878' : '#7d8c6c'} roughness={0.95} />
        </mesh>
      ))}
    </group>
  )
}

/** Sheer linen curtain panel: gentle sine folds, translucent daylight. */
export function SheerCurtain({
  width = 1,
  height = 2.2,
  position,
  rotation = [0, 0, 0],
  opacity = 0.38,
}: {
  width?: number
  height?: number
  position: [number, number, number]
  rotation?: [number, number, number]
  opacity?: number
}) {
  const geometry = useMemo(() => {
    const geo = new PlaneGeometry(width, height, 24, 1)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      pos.setZ(i, Math.sin((x / width) * Math.PI * 6) * 0.045)
    }
    geo.computeVertexNormals()
    return geo
  }, [width, height])
  return (
    <mesh geometry={geometry} position={position} rotation={rotation}>
      <meshStandardMaterial
        color="#fdf9f0"
        transparent
        opacity={opacity}
        roughness={0.9}
        side={DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

/** Blown-out daylight plane behind a window — reads as the world outside. */
export function WindowGlow({
  width,
  height,
  position,
  rotation = [0, 0, 0],
  color = '#fff8ea',
}: {
  width: number
  height: number
  position: [number, number, number]
  rotation?: [number, number, number]
  color?: string
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial color={color} toneMapped={false} side={DoubleSide} />
    </mesh>
  )
}

/* ------------------------------------------------------------------ */
/* lighting rig — one per variant, tuned inside each scene             */
/* ------------------------------------------------------------------ */

export function StudioEnvironment({ tint = '#fff3e2' }: { tint?: string }) {
  return (
    <Environment resolution={256} frames={1}>
      <color attach="background" args={['#efe7d9']} />
      {/* big soft ceiling bounce */}
      <Lightformer
        intensity={0.9}
        position={[0, 5, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[11, 11, 1]}
        color="#fff8ec"
      />
      {/* window-side wash */}
      <Lightformer
        intensity={1.3}
        position={[6, 2.4, 2]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={[5, 2.6, 1]}
        color={tint}
      />
      <Lightformer
        intensity={0.45}
        position={[-6, 2, -2]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[5, 2.4, 1]}
        color="#e8ecf2"
      />
    </Environment>
  )
}
