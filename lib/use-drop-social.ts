'use client'

import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  isReactionEmoji,
  socialTopic,
  type ReactionEmoji,
} from '@/lib/social-events'

export type Announcement =
  | {
      id: number
      kind: 'claim' | 'paid'
      firstName: string
      productName: string
      qty: number
    }
  | { id: number; kind: 'summary'; paid: boolean; count: number }

const ANNOUNCEMENT_TTL_MS = 4_000
const COALESCE_WINDOW_MS = 30_000
// More than this many events inside the window collapses to a summary line.
const COALESCE_THRESHOLD = 2
const REACT_MIN_INTERVAL_MS = 250

type SocialEventPayload = {
  firstName?: unknown
  productName?: unknown
  qty?: unknown
}

// Anonymous per-tab presence key: no cookies, no PII.
function presenceKey() {
  const storageKey = 'drops-social-session'
  try {
    const existing = window.sessionStorage.getItem(storageKey)
    if (existing) return existing
    const created = crypto.randomUUID()
    window.sessionStorage.setItem(storageKey, created)
    return created
  } catch {
    return crypto.randomUUID()
  }
}

/**
 * The drop page's social nervous system (future-ideas §2): presence-backed
 * viewer count, server-emitted claim/paid announcements (one visible toast,
 * bursts coalesced), and best-effort emoji reactions. Everything degrades to
 * silence — if the websocket is blocked the page renders exactly as v1.
 */
export function useDropSocial(
  supabase: SupabaseClient,
  dropId: string,
  { present = true }: { present?: boolean } = {},
) {
  const [watching, setWatching] = useState(0)
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const recentEventsRef = useRef<{ paid: boolean; at: number }[]>([])
  const nextIdRef = useRef(1)
  const dismissTimerRef = useRef<number | undefined>(undefined)
  const lastReactAtRef = useRef(0)
  const reactionListenersRef = useRef(new Set<(emoji: ReactionEmoji) => void>())

  const showAnnouncement = useCallback(
    (kind: 'claim' | 'paid', payload: SocialEventPayload | undefined) => {
      const firstName =
        typeof payload?.firstName === 'string' && payload.firstName
          ? payload.firstName
          : 'Someone'
      const productName =
        typeof payload?.productName === 'string' ? payload.productName : ''
      const qty =
        typeof payload?.qty === 'number' && payload.qty > 0 ? payload.qty : 1
      if (!productName) return

      const now = Date.now()
      const recent = recentEventsRef.current
        .filter((event) => now - event.at < COALESCE_WINDOW_MS)
        .concat({ paid: kind === 'paid', at: now })
      recentEventsRef.current = recent

      const id = nextIdRef.current++
      const paidCount = recent.filter((event) => event.paid).length

      // A burst collapses to one honest summary line; money is the louder
      // signal, so paid events win the wording.
      setAnnouncement(
        recent.length > COALESCE_THRESHOLD
          ? {
              id,
              kind: 'summary',
              paid: paidCount > 0,
              count: paidCount > 0 ? paidCount : recent.length,
            }
          : { id, kind, firstName, productName, qty },
      )

      window.clearTimeout(dismissTimerRef.current)
      dismissTimerRef.current = window.setTimeout(
        () => setAnnouncement(null),
        ANNOUNCEMENT_TTL_MS,
      )
    },
    [],
  )

  useEffect(() => {
    let channel: RealtimeChannel | undefined

    try {
      channel = supabase.channel(
        socialTopic(dropId),
        present ? { config: { presence: { key: presenceKey() } } } : undefined,
      )

      channel
        .on('presence', { event: 'sync' }, () => {
          setWatching(Object.keys(channel!.presenceState()).length)
        })
        .on('broadcast', { event: 'claim' }, ({ payload }) =>
          showAnnouncement('claim', payload as SocialEventPayload),
        )
        .on('broadcast', { event: 'paid' }, ({ payload }) =>
          showAnnouncement('paid', payload as SocialEventPayload),
        )
        .on('broadcast', { event: 'react' }, ({ payload }) => {
          const emoji = (payload as { emoji?: unknown } | undefined)?.emoji
          if (!isReactionEmoji(emoji)) return
          reactionListenersRef.current.forEach((listener) => listener(emoji))
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED' && present) {
            void channel!.track({ at: new Date().toISOString() })
          }
        })

      channelRef.current = channel
    } catch (caught) {
      // Venue wifi or a strict browser blocked the websocket — the social
      // layer is silently absent and the page renders as v1.
      console.warn('Social layer unavailable', caught)
    }

    return () => {
      channelRef.current = null
      window.clearTimeout(dismissTimerRef.current)
      if (channel) void supabase.removeChannel(channel)
    }
  }, [supabase, dropId, present, showAnnouncement])

  const react = useCallback((emoji: ReactionEmoji) => {
    const now = Date.now()
    if (now - lastReactAtRef.current < REACT_MIN_INTERVAL_MS) return
    lastReactAtRef.current = now

    // Broadcast doesn't echo to self — mirror locally so your own reaction
    // floats even when nobody else is in the room.
    reactionListenersRef.current.forEach((listener) => listener(emoji))
    void channelRef.current?.send({
      type: 'broadcast',
      event: 'react',
      payload: { type: 'react', emoji, at: new Date().toISOString() },
    })
  }, [])

  const subscribeToReactions = useCallback(
    (listener: (emoji: ReactionEmoji) => void) => {
      reactionListenersRef.current.add(listener)
      return () => {
        reactionListenersRef.current.delete(listener)
      }
    },
    [],
  )

  return { watching, announcement, react, subscribeToReactions }
}
