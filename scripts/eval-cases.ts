import type { StorefrontTheme } from '@/lib/drop-builder'

export type DraftEvalCase = {
  name: string
  images: string[]
  products: Array<{ name: string; price: number }>
  vertical: StorefrontTheme['vertical']
  expectedNeedsInput: Array<'stock' | 'window' | 'deliveryFee' | 'pickup'>
  provenance: string
}

export const draftEvalCases: DraftEvalCase[] = [
  {
    name: 'Panipuri sets',
    images: ['docs/test-images/set_1.jpeg', 'docs/test-images/set_2.jpeg'],
    products: [
      { name: 'Set A', price: 35 },
      { name: 'Set B', price: 65 },
    ],
    vertical: 'fnb',
    expectedNeedsInput: ['stock', 'window', 'deliveryFee', 'pickup'],
    provenance: 'Existing repository seller-menu fixtures.',
  },
  {
    name: 'Studio Sunday fashion',
    images: ['docs/test-images/fashion-studio-sunday.png'],
    products: [
      { name: 'Linen Day Shirt', price: 42 },
      { name: 'Pleated Easy Trouser', price: 58 },
    ],
    vertical: 'fashion',
    expectedNeedsInput: ['stock', 'window', 'deliveryFee', 'pickup'],
    provenance: 'Synthetic fixture generated with OpenAI image generation.',
  },
  {
    name: 'Soft Hour skincare',
    images: ['docs/test-images/beauty-soft-hour-skin.png'],
    products: [
      { name: 'Cloud Milk Cleanser', price: 26 },
      { name: 'Dew Barrier Serum', price: 34 },
    ],
    vertical: 'beauty',
    expectedNeedsInput: ['stock', 'window', 'deliveryFee', 'pickup'],
    provenance: 'Synthetic fixture generated with OpenAI image generation.',
  },
]
