/**
 * PROTOTYPE — throwaway. Mock sellers + products for the /prototype
 * storefront explorations. Real WhatsApp-seller photos from docs/test-images.
 */

export type ProtoProduct = {
  id: string
  name: string
  variant?: string | null
  price: number
  left: number | null // null = unlimited
  image: string
  soldOut?: boolean
}

export type ProtoSeller = {
  name: string
  dropTitle: string
  tagline: string
  accent: string
  vertical?: 'fnb' | 'fashion' | 'beauty' | 'collectibles' | 'services' | 'other'
  href?: string
  products: ProtoProduct[]
}

export const SHOPHOUSE: ProtoSeller = {
  name: 'Roti Wife',
  dropTitle: 'Sunday Panipuri Club',
  tagline: 'A corner shophouse, mid-morning. The spec vibe, interior-designed.',
  accent: '#c2571f',
  products: [
    {
      id: 'pp-b',
      name: 'Set B · 70 puri',
      price: 65,
      left: 4,
      image: '/prototype/panipuri-b.jpg',
    },
    {
      id: 'pp-a',
      name: 'Set A · 35 puri',
      price: 35,
      left: 9,
      image: '/prototype/panipuri-a.jpg',
    },
    {
      id: 'pp-extra',
      name: 'Extra puri · 20pc',
      price: 12,
      left: null,
      image: '/prototype/puri-close.jpg',
    },
    {
      id: 'pp-sauce',
      name: 'The chutney duo',
      price: 8,
      left: 0,
      image: '/prototype/sauces.jpg',
      soldOut: true,
    },
  ],
}

export const FRONT_ROOM: ProtoSeller = {
  name: 'Soft Hour Goods',
  dropTitle: 'Made at the front table',
  tagline: "A tiny home shop, five minutes after the maker stepped out.",
  accent: '#73806a',
  products: [
    {
      id: 'sk-cleanser',
      name: 'Cloud Milk Cleanser',
      price: 26,
      left: 7,
      image: '/prototype/skin.jpg',
    },
    {
      id: 'sk-duo',
      name: 'The Soft Hour duo',
      price: 54,
      left: 3,
      image: '/prototype/skin-duo.jpg',
    },
    {
      id: 'sk-serum',
      name: 'Dew Barrier Serum',
      price: 34,
      left: 11,
      image: '/prototype/skin-serum.jpg',
    },
  ],
}

export const CONSERVATORY: ProtoSeller = {
  name: 'Studio Sunday',
  dropTitle: 'Slow linen, small batches',
  tagline: 'A garden conservatory turned weekend atelier.',
  accent: '#75865a',
  products: [
    {
      id: 'ln-set',
      name: 'The Sunday set',
      price: 92,
      left: 5,
      image: '/prototype/linen.jpg',
    },
    {
      id: 'ln-shirt',
      name: 'Linen Day Shirt',
      price: 42,
      left: 8,
      image: '/prototype/linen-square.jpg',
    },
    {
      id: 'ln-trouser',
      name: 'Pleated Easy Trouser',
      price: 58,
      left: 2,
      image: '/prototype/linen-wide.jpg',
    },
  ],
}

/* ------------------------------------------------------------------ */

export type VariantMeta = {
  key: string
  label: string
  name: string
  blurb: string
  seller: ProtoSeller
  camera: { position: [number, number, number]; target: [number, number, number] }
}

export const VARIANTS: VariantMeta[] = [
  {
    key: 'domestic-circuit',
    label: 'A',
    name: 'The Working Circuit',
    blurb:
      'Two generous multi-product stations: wearables gather by the window, while desk and small goods live on the packing sideboard. The middle stays social and clear.',
    seller: FRONT_ROOM,
    camera: { position: [4.9, 1.78, 5.6], target: [-0.2, 0.95, -0.45] },
  },
  {
    key: 'domestic-loop',
    label: 'B',
    name: 'The Supper Circuit',
    blurb:
      'A food-safe circuit: supper sets share a serving dresser while drinks and extras sit at the window counter. Nothing hangs where dinner should be served.',
    seller: FRONT_ROOM,
    camera: { position: [4.8, 1.82, 5.5], target: [-0.25, 1.0, -0.55] },
  },
  {
    key: 'shophouse',
    label: 'C',
    name: 'The Corner Shophouse',
    blurb:
      'The spec vibe, interior-designed: limewash plaster, oak beams, an arched niche for the hero, brass picture lights, a fluted counter, one big mullioned window.',
    seller: SHOPHOUSE,
    camera: { position: [6.4, 2.6, 6.6], target: [-0.6, 1.2, -0.9] },
  },
  {
    key: 'front-room',
    label: 'D',
    name: 'The Maker’s Front Room',
    blurb:
      'A small, lived-in selling room: one grainy worktable, three chosen objects, window light, a cold mug and half-packed orders. The owner will be right back.',
    seller: FRONT_ROOM,
    camera: { position: [4.5, 1.72, 5.35], target: [-0.35, 1.0, -0.35] },
  },
  {
    key: 'conservatory',
    label: 'E',
    name: 'The Conservatory',
    blurb:
      'A garden glasshouse turned weekend atelier: terracotta tiles, white brick, steel-and-glass gable roof throwing rafter shadows, a potting bench for a counter.',
    seller: CONSERVATORY,
    camera: { position: [5.2, 2.4, 6.4], target: [-0.6, 1.15, -0.7] },
  },
]

export const DEFAULT_VARIANT = 'domestic-circuit'
