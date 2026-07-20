import { createServiceClient } from '@/lib/db'
import { allSoldOut, dropWindowClosed } from '@/lib/drop-state'
import type {
  ManageDrop,
  ManageOrder,
  ManageSnapshot,
  OrderStatus,
  Product,
} from '@/lib/types'

type OrderRow = {
  id: string
  product_id: string
  product_variant_id: string
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

export class ManageConsoleError extends Error {}

function orderPriority(status: OrderStatus) {
  return status === 'PAID_LATE' ? 0 : 1
}

function consoleHasSettled(drop: ManageDrop, products: Product[]) {
  return dropWindowClosed(drop) || allSoldOut(products)
}

export async function getManageSnapshot(
  token: string,
): Promise<ManageSnapshot | null> {
  const supabase = createServiceClient()
  const { data: drop, error: dropError } = await supabase
    .from('drops')
    .select(
      'id, seller_name, seller_slug, drop_slug, fulfilment, delivery_fee, pickup_note, window_ends_at, status',
    )
    .eq('manage_token', token)
    .maybeSingle<ManageDrop>()

  if (dropError) {
    throw new ManageConsoleError(`Could not load managed drop: ${dropError.message}`)
  }
  if (!drop) return null

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*, variants:product_variants(*)')
    .eq('drop_id', drop.id)
    .order('price', { ascending: false })
    .returns<Product[]>()

  if (productsError) {
    throw new ManageConsoleError(
      `Could not load managed products: ${productsError.message}`,
    )
  }

  const productRows = products ?? []
  const productIds = productRows.map((product) => product.id)
  let orderRows: OrderRow[] = []

  if (productIds.length > 0) {
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(
        'id, product_id, product_variant_id, selected_customizations, qty, buyer_name, buyer_contact, fulfilment, address, amount, status, paid_at, created_at',
      )
      .in('product_id', productIds)
      .order('created_at', { ascending: false })
      .returns<OrderRow[]>()

    if (ordersError) {
      throw new ManageConsoleError(
        `Could not load managed orders: ${ordersError.message}`,
      )
    }

    orderRows = orders ?? []
  }

  const productsById = new Map(
    productRows.map((product) => [product.id, product]),
  )
  const variantsById = new Map(
    productRows.flatMap((product) =>
      product.variants.map((variant) => [variant.id, variant] as const),
    ),
  )
  const orders: ManageOrder[] = orderRows
    .map((order) => {
      const product = productsById.get(order.product_id)
      if (!product) return null

      return {
        ...order,
        product_name: product.name,
        product_variant: product.variant,
        inventory_variant:
          variantsById.get(order.product_variant_id)?.label ?? null,
        selected_customizations: order.selected_customizations ?? {},
      }
    })
    .filter((order): order is ManageOrder => order !== null)
    .sort((a, b) => {
      const priority = orderPriority(a.status) - orderPriority(b.status)
      if (priority !== 0) return priority
      return Date.parse(b.created_at) - Date.parse(a.created_at)
    })

  return {
    drop,
    products: productRows,
    orders,
    settled: consoleHasSettled(drop, productRows),
    refreshed_at: new Date().toISOString(),
  }
}

/**
 * The popup that became a store (future-ideas §3): a settled drop converts to
 * a permanent storefront — same URL, no countdown, status back to live. The
 * link is the brand, so nothing else changes.
 */
export async function keepDropAlive(
  token: string,
): Promise<ManageSnapshot | null> {
  const supabase = createServiceClient()
  const { data: drop, error } = await supabase
    .from('drops')
    .update({ status: 'live', window_ends_at: null })
    .eq('manage_token', token)
    .select('id')
    .maybeSingle<{ id: string }>()

  if (error) {
    throw new ManageConsoleError(
      `Could not keep managed drop alive: ${error.message}`,
    )
  }
  if (!drop) return null

  return getManageSnapshot(token)
}

export async function endManagedDrop(
  token: string,
): Promise<ManageSnapshot | null> {
  const supabase = createServiceClient()
  const { data: drop, error } = await supabase
    .from('drops')
    .update({ status: 'ended' })
    .eq('manage_token', token)
    .select('id')
    .maybeSingle<{ id: string }>()

  if (error) {
    throw new ManageConsoleError(`Could not end managed drop: ${error.message}`)
  }
  if (!drop) return null

  return getManageSnapshot(token)
}
