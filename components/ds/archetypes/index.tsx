import type { StorefrontTheme } from '@/lib/drop-builder'
import type { Product } from '@/lib/types'

import { GridArchetype } from './grid'
import { MenuArchetype } from './menu'

export type ArchetypeProps = {
  theme: StorefrontTheme
  products: Product[]
  fulfilment: 'pickup' | 'delivery' | 'both'
  deliveryFee: number
  pickupNote: string | null
  heroImageUrl?: string | null
}

/**
 * Archetype switch shared by the buyer storefront (F1) and the builder
 * preview (F2). `spotlight`/`tiers` are reserved Phase 3 — they fall back to
 * `grid`/`menu` respectively so the schema can carry them today.
 */
export function ArchetypeLayout(props: ArchetypeProps) {
  switch (props.theme.archetype) {
    case 'grid':
      return <GridArchetype {...props} />
    case 'spotlight':
      // reserved — Phase 3
      return <GridArchetype {...props} />
    case 'tiers':
      // reserved — Phase 3
      return <MenuArchetype {...props} />
    case 'menu':
    default:
      return <MenuArchetype {...props} />
  }
}