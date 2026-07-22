import type {
  CustomizationGroup,
  ProductDisplayKind,
  StorefrontTheme,
} from '@/lib/drop-builder'

export type { StorefrontTheme } from '@/lib/drop-builder'

export type Drop = {
  id: string
  seller_name: string
  seller_slug: string
  drop_slug: string
  manage_token: string
  fulfilment: 'pickup' | 'delivery' | 'both'
  delivery_fee: number
  pickup_note: string | null
  window_ends_at: string | null
  status: 'live' | 'ended'
  theme: StorefrontTheme | null
  created_at: string
}

export type OrderStatus = 'PENDING' | 'PAID' | 'PAID_LATE'

export type ProductVariant = {
  id: string
  product_id: string
  label: string | null
  price: number
  stock_total: number | null
  stock_sold: number
  position: number
}

export type Product = {
  id: string
  drop_id: string
  name: string
  variant: string | null
  image_url: string | null
  display_kind: ProductDisplayKind
  price: number
  stock_total: number | null
  stock_sold: number
  inventory_choice_name: string | null
  customization_groups: CustomizationGroup[]
  variants: ProductVariant[]
}

export type ManageDrop = Pick<
  Drop,
  | 'id'
  | 'seller_name'
  | 'seller_slug'
  | 'drop_slug'
  | 'fulfilment'
  | 'delivery_fee'
  | 'pickup_note'
  | 'window_ends_at'
  | 'status'
>

export type ManageOrder = {
  id: string
  product_id: string
  product_variant_id: string
  product_name: string
  product_variant: string | null
  inventory_variant: string | null
  selected_customizations: Record<string, string>
  qty: number
  buyer_name: string
  buyer_contact: string
  fulfilment: 'pickup' | 'delivery'
  address: string | null
  amount: number
  status: OrderStatus
  paid_at: string | null
  created_at: string
}

export type ManageSnapshot = {
  drop: ManageDrop
  products: Product[]
  orders: ManageOrder[]
  settled: boolean
  refreshed_at: string
}
