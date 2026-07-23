/**
 * Social layer wire format (future-ideas §2) — shared between the server
 * emitters and the buyer/console clients. Claim and paid events are
 * server-emitted only; react events are client-emitted atmosphere and carry
 * no facts.
 */

export type ReactionEmoji = 'heart' | 'fire'

export const REACTION_EMOJI: Record<ReactionEmoji, string> = {
  heart: '❤️',
  fire: '🔥',
}

export type SocialEvent =
  | { type: 'claim'; firstName: string; productName: string; qty: number; at: string }
  | {
      type: 'paid'
      buyerName: string
      productName: string
      qty: number
      note?: string
      at: string
    }
  | { type: 'react'; emoji: ReactionEmoji; at: string; key?: string }

export type Appreciation = {
  id: string
  buyerName: string
  note: string
}

/** Stock updates and rare appreciation notes share one channel per drop. */
export function dropProductsTopic(dropId: string) {
  return `drop-${dropId}-products`
}

/** One social channel per drop, a sibling of the products channel. */
export function socialTopic(dropId: string) {
  return `drop-${dropId}-social`
}

/**
 * Privacy rule: first name only, or anonymous. Applied server-side before
 * anything hits the wire — contact details never leave the server.
 */
export function firstNameOnly(name: string | null | undefined): string {
  const first = name?.trim().split(/\s+/)[0] ?? ''
  return first ? first.slice(0, 24) : 'Someone'
}

/** Preserve the buyer-entered checkout name while normalizing whitespace. */
export function buyerDisplayName(name: string | null | undefined): string {
  const displayName = name?.trim().replace(/\s+/g, ' ') ?? ''
  return displayName ? displayName.slice(0, 120) : 'Someone'
}

export function isReactionEmoji(value: unknown): value is ReactionEmoji {
  return value === 'heart' || value === 'fire'
}
