import type {
  ProductDisplayKind,
  StorefrontTheme,
} from '@/lib/drop-builder'
import type { Product } from '@/lib/types'

export const MAX_WORLD_PRODUCTS = 12
const STATION_CAPACITY = 3

export type StationKind =
  | 'serving'
  | 'dresser'
  | 'bench'
  | 'rail'
  | 'packing'

export type StationZone = 'back-left' | 'left-wall' | 'window' | 'front-right'

export type SceneSlot = {
  productId: string
  imageUrl: string | null
  displayKind: ProductDisplayKind
}

export type SceneStation = {
  id: string
  kind: StationKind
  zone: StationZone
  slots: SceneSlot[]
}

export type SceneConfig = {
  template: 'shop'
  accent: StorefrontTheme['accent']
  sign: { title: string; sellerName: string }
  ambience: StorefrontTheme['voice']['tone']
  stations: SceneStation[]
}

type SceneProduct = Pick<Product, 'id' | 'image_url'> & {
  display_kind?: ProductDisplayKind | null
  enhanced_image_url?: string | null
  original_image_url?: string | null
}

const ZONES: readonly StationZone[] = [
  'back-left',
  'window',
  'left-wall',
  'front-right',
]

const STATION_CIRCUITS: Record<ProductDisplayKind, readonly StationKind[]> = {
  served: ['serving', 'dresser', 'packing', 'serving'],
  hung: ['rail', 'bench', 'dresser', 'rail'],
  shelved: ['dresser', 'bench', 'packing', 'dresser'],
  stacked: ['bench', 'dresser', 'packing', 'bench'],
  framed: ['dresser', 'bench', 'packing', 'dresser'],
  tabletop: ['packing', 'dresser', 'bench', 'packing'],
}

function imageUrl(product: SceneProduct) {
  return (
    product.enhanced_image_url ??
    product.image_url ??
    product.original_image_url ??
    null
  )
}

/**
 * The agent chooses a bounded product/display relationship. This planner owns
 * circulation: it fills small three-product stations around the room in a
 * stable circuit, keeping the central rug and storefront sign unobstructed.
 */
function buildStations(products: readonly SceneProduct[]): SceneStation[] {
  const stations: SceneStation[] = []

  for (const product of products.slice(0, MAX_WORLD_PRODUCTS)) {
    const displayKind = product.display_kind ?? 'shelved'
    const preferredKinds = STATION_CIRCUITS[displayKind]
    const matchingStation = stations.find(
      (station) =>
        preferredKinds.includes(station.kind) &&
        station.slots.length < STATION_CAPACITY,
    )
    const leastFullStation = stations
      .filter((station) => station.slots.length < STATION_CAPACITY)
      .sort((a, b) => a.slots.length - b.slots.length)[0]

    let station = matchingStation
    if (!station && stations.length < ZONES.length) {
      const stationIndex = stations.length
      station = {
        id: `station-${stationIndex}`,
        kind: preferredKinds[stationIndex],
        zone: ZONES[stationIndex],
        slots: [],
      }
      stations.push(station)
    } else if (!station) {
      station = leastFullStation
    }

    station?.slots.push({
      productId: product.id,
      imageUrl: imageUrl(product),
      displayKind,
    })
  }

  return stations
}

export function buildSceneConfig(
  products: readonly SceneProduct[],
  theme: StorefrontTheme | null,
  sellerName = '',
): SceneConfig | null {
  if (!theme) return null

  return {
    template: 'shop',
    accent: theme.accent,
    sign: {
      title: theme.voice.dropTitle,
      sellerName,
    },
    ambience: theme.voice.tone,
    stations: buildStations(products),
  }
}
