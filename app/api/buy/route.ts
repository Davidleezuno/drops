import { NextResponse } from 'next/server'

import { fulfilmentIsAvailable, parseBuyRequest } from '@/lib/checkout'
import { createServiceClient } from '@/lib/db'
import {
  createHitPayPaymentRequest,
  HitPayRequestError,
} from '@/lib/hitpay'
import { centsToSgd, orderTotalCents, sgdToCents } from '@/lib/money'
import type { Drop, Product } from '@/lib/types'

type ProductWithDrop = Product & { drop: Drop }

export async function POST(request: Request) {
  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid checkout details' },
      { status: 400 },
    )
  }

  const parsed = parseBuyRequest(json)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  if (!appUrl) {
    console.error('NEXT_PUBLIC_APP_URL is not configured')
    return NextResponse.json(
      { error: 'Checkout is temporarily unavailable' },
      { status: 500 },
    )
  }

  const details = parsed.value
  const supabase = createServiceClient()
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*, drop:drops(*)')
    .eq('id', details.productId)
    .maybeSingle<ProductWithDrop>()

  if (productError) {
    console.error('Failed to load checkout product', productError)
    return NextResponse.json(
      { error: 'Checkout is temporarily unavailable' },
      { status: 500 },
    )
  }

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  const dropEnded =
    product.drop.status === 'ended' ||
    new Date(product.drop.window_ends_at).getTime() <= Date.now()

  if (dropEnded) {
    return NextResponse.json({ error: 'This drop has ended' }, { status: 409 })
  }

  if (product.stock_total - product.stock_sold < details.quantity) {
    return NextResponse.json(
      { error: 'There is not enough stock left for that quantity' },
      { status: 409 },
    )
  }

  if (!fulfilmentIsAvailable(product.drop.fulfilment, details.fulfilment)) {
    return NextResponse.json(
      { error: 'That fulfilment option is not available' },
      { status: 400 },
    )
  }

  const amount = centsToSgd(
    orderTotalCents({
      unitPrice: product.price,
      quantity: details.quantity,
      deliveryFee: product.drop.delivery_fee,
      fulfilment: details.fulfilment,
    }),
  )
  const deliveryDescription =
    details.fulfilment === 'delivery'
      ? ` + S$${centsToSgd(sgdToCents(product.drop.delivery_fee))} delivery`
      : ''

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      product_id: product.id,
      qty: details.quantity,
      buyer_name: details.buyerName,
      buyer_contact: details.buyerContact,
      fulfilment: details.fulfilment,
      address: details.address,
      amount,
      status: 'PENDING',
    })
    .select('id')
    .single<{ id: string }>()

  if (orderError) {
    console.error('Failed to create pending order', orderError)
    return NextResponse.json(
      { error: 'Could not start checkout' },
      { status: 500 },
    )
  }

  let paymentRequest
  try {
    paymentRequest = await createHitPayPaymentRequest({
      amount,
      referenceNumber: order.id,
      purpose: `${product.drop.seller_name} — ${product.name} ×${details.quantity}${deliveryDescription}`,
      buyerName: details.buyerName,
      buyerContact: details.buyerContact,
      redirectUrl: `${appUrl}/order/${order.id}`,
    })
  } catch (error) {
    console.error('HitPay payment request failed', error)
    const message =
      error instanceof HitPayRequestError && error.status === 429
        ? 'Checkout is busy. Please try again in a moment.'
        : 'Could not open HitPay checkout. Please try again.'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  const { error: savePaymentError } = await supabase
    .from('orders')
    .update({ hitpay_payment_request_id: paymentRequest.id })
    .eq('id', order.id)

  if (savePaymentError) {
    console.error('Failed to attach HitPay payment request', savePaymentError)
    return NextResponse.json(
      { error: 'Could not finish checkout setup' },
      { status: 500 },
    )
  }

  return NextResponse.json(
    { checkoutUrl: paymentRequest.url, orderId: order.id },
    { status: 201 },
  )
}
