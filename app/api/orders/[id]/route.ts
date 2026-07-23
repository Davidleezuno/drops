import { after, NextResponse } from 'next/server'

import { createServiceClient } from '@/lib/db'
import {
  getHitPayPaymentRequestStatus,
  HitPayRequestError,
} from '@/lib/hitpay'
import { broadcastPaidOrder } from '@/lib/social-server'
import type { OrderStatus } from '@/lib/types'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_BUYER_NOTE_LENGTH = 180

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

  const { data: settlementOutcome, error: settlementError } = await supabase.rpc(
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

  // Same emit point as the webhook: announce only a settlement this call
  // performed, so a webhook/fallback race never double-announces.
  if (settlementOutcome === 'paid') {
    after(() => broadcastPaidOrder(order.id))
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Enter a note first' }, { status: 400 })
  }

  const note =
    typeof body === 'object' &&
    body !== null &&
    'note' in body &&
    typeof body.note === 'string'
      ? body.note.trim()
      : ''
  if (!note || note.length > MAX_BUYER_NOTE_LENGTH) {
    return NextResponse.json(
      { error: `Note must be 1–${MAX_BUYER_NOTE_LENGTH} characters` },
      { status: 400 },
    )
  }

  const supabase = createServiceClient()
  const noteAt = new Date().toISOString()
  const { data: updated, error } = await supabase
    .from('orders')
    .update({ buyer_note: note, buyer_note_at: noteAt })
    .eq('id', id)
    .eq('status', 'PAID')
    .is('buyer_note', null)
    .select('id')
    .maybeSingle<{ id: string }>()

  if (error) {
    console.error('Failed to save buyer note', error)
    return NextResponse.json({ error: 'Could not send your note' }, { status: 500 })
  }
  if (!updated) {
    const { data: order } = await supabase
      .from('orders')
      .select('status, buyer_note')
      .eq('id', id)
      .maybeSingle<{ status: OrderStatus; buyer_note: string | null }>()

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    if (order.buyer_note) {
      return NextResponse.json({ error: 'Your note was already sent' }, { status: 409 })
    }
    return NextResponse.json(
      { error: 'Notes are available after payment is confirmed' },
      { status: 409 },
    )
  }

  // Re-broadcast the verified purchase with its newly attached appreciation.
  // The room adds the note to its wall; payment state remains server-owned.
  after(() => broadcastPaidOrder(id))

  return NextResponse.json({ note })
}
