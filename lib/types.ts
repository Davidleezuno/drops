export type Drop = {
  id: string
  seller_name: string
  seller_slug: string
  drop_slug: string
  manage_token: string
  fulfilment: 'pickup' | 'delivery' | 'both'
  delivery_fee: number
  pickup_note: string | null
  window_ends_at: string
  status: 'live' | 'ended'
  created_at: string
}

export type OrderStatus = 'PENDING' | 'PAID' | 'PAID_LATE'

export type Product = {
  id: string
  drop_id: string
  name: string
  variant: string | null
  price: number
  stock_total: number
  stock_sold: number
}
