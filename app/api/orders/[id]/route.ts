import { NextResponse } from 'next/server'

import { createServiceClient } from '@/lib/db'
import {
  getHitPayPaymentRequestStatus,
  HitPayRequestError,
} from '@/lib/hitpay'
import type { OrderStatus } from '@/lib/types'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type OrderPaymentState = {
  id: string
  status: OrderStatus
  hitpay_payment_request_id: string | null
}

function statusResponse(status: OrderStatus, init?: ResponseInit) {
  return NextResponse.json(
    { status },
    {
      ...init,
      headers: { 'Cache-Control': 'no-store' },
    },
  )
}

async function loadOrder(id: string) {
  const supabase = createServiceClient()
  const result = await supabase
    .from('orders')
    .select('id, status, hitpay_payment_request_id')
    .eq('id', id)
    .maybeSingle<OrderPaymentState>()

  return { supabase, ...result }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const { data: order, error } = await loadOrder(id)
  if (error) {
    console.error('Failed to load order status', error)
    return NextResponse.json(
      { error: 'Could not check payment yet' },
      { status: 500 },
    )
  }
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  return statusResponse(order.status)
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const { supabase, data: order, error } = await loadOrder(id)
  if (error) {
    console.error('Failed to load order for payment fallback', error)
    return NextResponse.json(
      { error: 'Could not confirm payment yet' },
      { status: 500 },
    )
  }
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }
  if (order.status !== 'PENDING' || !order.hitpay_payment_request_id) {
    return statusResponse(order.status)
  }

  let payment
  try {
    payment = await getHitPayPaymentRequestStatus(
      order.hitpay_payment_request_id,
    )
  } catch (caught) {
    console.error('HitPay fallback status check failed', caught)
    const status =
      caught instanceof HitPayRequestError && caught.status === 404 ? 404 : 503
    return NextResponse.json(
      { error: 'Could not confirm payment yet' },
      { status },
    )
  }

  if (payment.referenceNumber !== order.id) {
    console.error('HitPay fallback returned a mismatched order reference')
    return NextResponse.json(
      { error: 'Could not confirm payment yet' },
      { status: 502 },
    )
  }

  if (payment.status !== 'completed') {
    return statusResponse(order.status)
  }

  const { error: settlementError } = await supabase.rpc(
    'process_hitpay_payment',
    {
      p_event_id: payment.id,
      p_payload: payment.payload,
      p_reference_number: order.id,
      p_payment_request_id: payment.id,
    },
  )

  if (settlementError) {
    console.error('Failed to process HitPay status fallback', settlementError)
    return NextResponse.json(
      { error: 'Could not confirm payment yet' },
      { status: 500 },
    )
  }

  const { data: settledOrder, error: settledOrderError } = await supabase
    .from('orders')
    .select('status')
    .eq('id', order.id)
    .single<{ status: OrderStatus }>()

  if (settledOrderError) {
    console.error('Failed to reload settled order', settledOrderError)
    return NextResponse.json(
      { error: 'Could not confirm payment yet' },
      { status: 500 },
    )
  }

  return statusResponse(settledOrder.status)
}
