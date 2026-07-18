import { NextResponse } from 'next/server'
import { createHash, createHmac } from 'node:crypto'

import { createServiceClient } from '@/lib/db'
import { parseHitPayCompletedEvent } from '@/lib/hitpay'
import { verifyHitPaySignature } from '@/lib/verify'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const salt = process.env.HITPAY_WEBHOOK_SALT
  if (!salt) {
    console.error('HITPAY_WEBHOOK_SALT is not configured')
    return NextResponse.json({ error: 'Webhook unavailable' }, { status: 500 })
  }

  const rawBody = Buffer.from(await request.arrayBuffer())
  const signature = request.headers.get('hitpay-signature')

  if (!verifyHitPaySignature(rawBody, signature, salt)) {
    const normalizedSignature = signature?.trim() ?? ''
    const expectedSignature = createHmac('sha256', salt)
      .update(rawBody)
      .digest('hex')

    console.warn(
      JSON.stringify({
        tag: '[DEBUG-hitpay-signature]',
        signatureLength: normalizedSignature.length,
        signatureEncoding: /^[0-9a-f]+$/i.test(normalizedSignature)
          ? 'hex'
          : /^[A-Za-z0-9+/]+={0,2}$/.test(normalizedSignature)
            ? 'base64'
            : 'other',
        signatureSample: `${normalizedSignature.slice(0, 8)}…${normalizedSignature.slice(-8)}`,
        expectedSample: `${expectedSignature.slice(0, 8)}…${expectedSignature.slice(-8)}`,
        bodyBytes: rawBody.length,
        bodySha256: createHash('sha256')
          .update(rawBody)
          .digest('hex')
          .slice(0, 16),
        saltLength: salt.length,
        saltSha256: createHash('sha256')
          .update(salt)
          .digest('hex')
          .slice(0, 16),
        contentType: request.headers.get('content-type'),
        eventType: request.headers.get('hitpay-event-type'),
        eventObject: request.headers.get('hitpay-event-object'),
      }),
    )

    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody.toString('utf8'))
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  let event
  try {
    event = parseHitPayCompletedEvent(payload)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid webhook' },
      { status: 400 },
    )
  }

  if (!event) {
    return NextResponse.json({ received: true, outcome: 'ignored' })
  }

  if (!UUID_PATTERN.test(event.referenceNumber)) {
    return NextResponse.json(
      { error: 'Invalid reference number' },
      { status: 400 },
    )
  }

  const supabase = createServiceClient()
  const { data: outcome, error } = await supabase.rpc(
    'process_hitpay_payment',
    {
      p_event_id: event.id,
      p_payload: event.payload,
      p_reference_number: event.referenceNumber,
      p_payment_request_id: event.id,
    },
  )

  if (error) {
    console.error('Failed to process HitPay webhook', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true, outcome })
}
