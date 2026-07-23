'use client'

import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  isReactionEmoji,
  socialTopic,
  type Appreciation,
  type ReactionEmoji,
} from '@/lib/social-events'
import { presenceKey } from '@/lib/world/names'

export type Announcement =
  | {
      id: number
      kind: 'claim' | 'paid'
      firstName: string
      productName: string
      qty: number
      note?: string
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
  note?: unknown
  at?: unknown
}

export type ReactionEvent = { emoji: ReactionEmoji; key?: string }

/**
 * The drop page's social nervous system (future-ideas §2): presence-backed
 * viewer count, server-emitted claim/paid announcements (one visible toast,
 * bursts coalesced), and best-effort emoji reactions. Everything degrades to
 * silence — if the websocket is blocked the page renders exactly as v1.
 */
export function useDropSocial(
  supabase: SupabaseClient,
  dropId: string,
  {
    present = true,
    initialAppreciations = [],
  }: { present?: boolean; initialAppreciations?: Appreciation[] } = {},
) {
  const [watching, setWatching] = useState(0)
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [appreciations, setAppreciations] = useState(initialAppreciations)
  const [sessionKey] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : presenceKey(),
  )

  const channelRef = useRef<RealtimeChannel | null>(null)
  const recentEventsRef = useRef<{ paid: boolean; at: number }[]>([])
  const nextIdRef = useRef(1)
  const dismissTimerRef = useRef<number | undefined>(undefined)
  const lastReactAtRef = useRef(0)
  const reactionListenersRef = useRef(new Set<(emoji: ReactionEmoji) => void>())
  const reactionEventListenersRef = useRef(
    new Set<(event: ReactionEvent) => void>(),
  )
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

      const note =
        typeof payload?.note === 'string' ? payload.note.trim().slice(0, 180) : ''
      if (kind === 'paid' && note) {
        const noteId =
          typeof payload?.at === 'string' && payload.at
            ? payload.at
            : `${Date.now()}-${firstName}`
        setAppreciations((current) => {
          if (current.some((item) => item.id === noteId)) return current
          return [
            { id: noteId, firstName, productName, note },
            ...current,
          ].slice(0, 12)
        })
      }

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
        recent.length > COALESCE_THRESHOLD && !note
          ? {
              id,
              kind: 'summary',
              paid: paidCount > 0,
              count: paidCount > 0 ? paidCount : recent.length,
            }
          : {
              id,
              kind,
              firstName,
              productName,
              qty,
              ...(kind === 'paid' && note ? { note } : {}),
            },
      )

      window.clearTimeout(dismissTimerRef.current)
      dismissTimerRef.current = window.setTimeout(
        () => setAnnouncement(null),
        note ? 6_000 : ANNOUNCEMENT_TTL_MS,
      )
    },
    [],
  )

  useEffect(() => {
    if (present && !sessionKey) return

    let channel: RealtimeChannel | undefined

    try {
      channel = supabase.channel(
        socialTopic(dropId),
        present && sessionKey
          ? { config: { presence: { key: sessionKey } } }
          : undefined,
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
          const reaction = payload as
            | { emoji?: unknown; key?: unknown }
            | undefined
          const emoji = reaction?.emoji
          if (!isReactionEmoji(emoji)) return
          reactionListenersRef.current.forEach((listener) => listener(emoji))
          reactionEventListenersRef.current.forEach((listener) =>
            listener({
              emoji,
              key: typeof reaction?.key === 'string' ? reaction.key : undefined,
            }),
          )
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
  }, [supabase, dropId, present, sessionKey, showAnnouncement])

  const react = useCallback((emoji: ReactionEmoji) => {
    const now = Date.now()
    if (now - lastReactAtRef.current < REACT_MIN_INTERVAL_MS) return
    lastReactAtRef.current = now

    // Broadcast doesn't echo to self — mirror locally so your own reaction
    // floats even when nobody else is in the room.
    reactionListenersRef.current.forEach((listener) => listener(emoji))
    reactionEventListenersRef.current.forEach((listener) =>
      listener({ emoji, key: sessionKey ?? undefined }),
    )
    void channelRef.current?.send({
      type: 'broadcast',
      event: 'react',
      payload: {
        type: 'react',
        emoji,
        at: new Date().toISOString(),
        key: sessionKey ?? undefined,
      },
    })
  }, [sessionKey])

  const subscribeToReactions = useCallback(
    (listener: (emoji: ReactionEmoji) => void) => {
      reactionListenersRef.current.add(listener)
      return () => {
        reactionListenersRef.current.delete(listener)
      }
    },
    [],
  )

  const subscribeToReactionEvents = useCallback(
    (listener: (event: ReactionEvent) => void) => {
      reactionEventListenersRef.current.add(listener)
      return () => {
        reactionEventListenersRef.current.delete(listener)
      }
    },
    [],
  )

  return {
    watching,
    announcement,
    appreciations,
    presenceKey: sessionKey,
    react,
    subscribeToReactions,
    subscribeToReactionEvents,
  }
}
