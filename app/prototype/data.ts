/**
 * PROTOTYPE — throwaway. Mock sellers + products for the /prototype
 * storefront explorations. Real WhatsApp-seller photos from docs/test-images.
 */

export type ProtoProduct = {
  id: string
  name: string
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
  name: 'Soft Hour Skin',
  dropTitle: 'The evening edit',
  tagline: "A seller's actual front room, styled for company.",
  accent: '#8f7fb8',
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
    key: 'shophouse',
    label: 'A',
    name: 'The Corner Shophouse',
    blurb:
      'The spec vibe, interior-designed: limewash plaster, oak beams, an arched niche for the hero, brass picture lights, a fluted counter, one big mullioned window.',
    seller: SHOPHOUSE,
    camera: { position: [6.4, 2.6, 6.6], target: [-0.6, 1.2, -0.9] },
  },
  {
    key: 'front-room',
    label: 'B',
    name: 'The Front Room',
    blurb:
      "The most literal home-based business: the seller's living room, styled for company. Walnut credenza, leaning frames on picture ledges, bouclé sofa, tungsten lamps.",
    seller: FRONT_ROOM,
    camera: { position: [3.4, 1.8, 5.0], target: [-1.3, 1.0, -0.6] },
  },
  {
    key: 'conservatory',
    label: 'C',
    name: 'The Conservatory',
    blurb:
      'A garden glasshouse turned weekend atelier: terracotta tiles, white brick, steel-and-glass gable roof throwing rafter shadows, a potting bench for a counter.',
    seller: CONSERVATORY,
    camera: { position: [5.2, 2.4, 6.4], target: [-0.6, 1.15, -0.7] },
  },
]

export const DEFAULT_VARIANT = VARIANTS[0].key
