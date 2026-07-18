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
  product: {
    name: string
    variant: string | null
    drop: {
      seller_name: string
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
      'id, qty, amount, status, fulfilment, product:products!inner(name, variant, drop:drops!inner(seller_name))',
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
          variant: order.product.variant,
          quantity: order.qty,
          amount: order.amount,
          fulfilment: order.fulfilment,
          sellerName: order.product.drop.seller_name,
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
