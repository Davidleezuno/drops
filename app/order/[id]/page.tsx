import { notFound } from 'next/navigation'

import { Shell } from '@/components/ds/shell'
import { createServiceClient } from '@/lib/db'
import type { OrderStatus as PaymentStatus } from '@/lib/types'

import { OrderStatus } from './order-status'

export const dynamic = 'force-dynamic'

type OrderWithProduct = {
  id: string
  qty: number
  amount: number
  status: PaymentStatus
  fulfilment: 'pickup' | 'delivery'
  selected_customizations: Record<string, string>
  buyer_note: string | null
  inventory_variant: { label: string | null }
  product: {
    name: string
    variant: string | null
    drop: {
      seller_name: string
      seller_slug: string
      drop_slug: string
    }
  }
}

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createServiceClient()
  const { data: order, error } = await supabase
    .from('orders')
    .select(
      'id, qty, amount, status, fulfilment, selected_customizations, buyer_note, inventory_variant:product_variants!orders_product_variant_id_fkey(label), product:products!inner(name, variant, drop:drops!inner(seller_name, seller_slug, drop_slug))',
    )
    .eq('id', id)
    .maybeSingle<OrderWithProduct>()

  if (error) {
    console.error('Failed to load order status page', error)
    throw new Error('Could not load order')
  }
  if (!order) notFound()

  return (
    <Shell>
      <OrderStatus
        order={{
          id: order.id,
          status: order.status,
          productName: order.product.name,
          variant: [
            order.product.variant,
            order.inventory_variant.label,
            ...Object.values(order.selected_customizations ?? {}),
          ]
            .filter(Boolean)
            .join(' · ') || null,
          quantity: order.qty,
          amount: order.amount,
          fulfilment: order.fulfilment,
          sellerName: order.product.drop.seller_name,
          buyerNote: order.buyer_note,
          storePath: `/${encodeURIComponent(order.product.drop.seller_slug)}/${encodeURIComponent(order.product.drop.drop_slug)}`,
        }}
      />

      <footer className="mt-auto pt-12 text-center">
        <p className="font-mono text-xs text-muted-foreground/60">
          Payment status verified by HitPay
        </p>
      </footer>
    </Shell>
  )
}
