import { createServiceClient } from '@/lib/db'
import {
  buyerDisplayName,
  dropProductsTopic,
  firstNameOnly,
  socialTopic,
  type SocialEvent,
} from '@/lib/social-events'

/**
 * Server-side social broadcasts (future-ideas §2). Claim and paid events are
 * emitted only from here with the service-role client — clients can never
 * forge a purchase ticker. Always best-effort: announcements are atmosphere,
 * not state, so a failure must never break the money path.
 */
async function broadcastSocialEvent(
  dropId: string,
  event: SocialEvent,
  {
    topic = socialTopic(dropId),
    broadcastEvent = event.type,
  }: { topic?: string; broadcastEvent?: string } = {},
) {
  const supabase = createServiceClient()
  const channel = supabase.channel(topic)

  try {
    const outcome = await channel.httpSend(broadcastEvent, event)
    if (!outcome.success) {
      console.warn(
        `Social ${broadcastEvent} broadcast returned ${outcome.status}: ${outcome.error}`,
      )
    }
  } catch (caught) {
    console.warn(`Social ${broadcastEvent} broadcast failed`, caught)
  } finally {
    void supabase.removeChannel(channel)
  }
}

export async function broadcastClaim(input: {
  dropId: string
  buyerName: string
  productName: string
  qty: number
}) {
  await broadcastSocialEvent(input.dropId, {
    type: 'claim',
    firstName: firstNameOnly(input.buyerName),
    productName: input.productName,
    qty: input.qty,
    at: new Date().toISOString(),
  })
}

/**
 * Announce a webhook-confirmed payment. Loads the order fresh so both the
 * webhook and the status-poll fallback can share one emit point.
 */
export async function broadcastPaidOrder(orderId: string) {
  const supabase = createServiceClient()
  const { data: order, error } = await supabase
    .from('orders')
    .select('qty, buyer_name, buyer_note, buyer_note_at, product:products(name, drop_id)')
    .eq('id', orderId)
    .maybeSingle<{
      qty: number
      buyer_name: string
      buyer_note: string | null
      buyer_note_at: string | null
      product: { name: string; drop_id: string } | null
    }>()

  if (error || !order?.product) {
    if (error) console.warn('Could not load paid order for broadcast', error)
    return
  }

  await broadcastSocialEvent(
    order.product.drop_id,
    {
      type: 'paid',
      buyerName: buyerDisplayName(order.buyer_name),
      productName: order.product.name,
      qty: order.qty,
      ...(order.buyer_note ? { note: order.buyer_note } : {}),
      at: order.buyer_note_at ?? new Date().toISOString(),
    },
    {
      topic: dropProductsTopic(order.product.drop_id),
      broadcastEvent: 'appreciation',
    },
  )
}
