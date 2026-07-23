'use client'

import type { SupabaseClient } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef, useState } from 'react'

import { socialTopic, type Appreciation } from '@/lib/social-events'
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

type SocialEventPayload = {
  firstName?: unknown
  productName?: unknown
  qty?: unknown
  note?: unknown
  at?: unknown
}

/**
 * Purchase announcements come from paid stock changes. Stock already fans out
 * to every storefront, so ordinary banners add no second Realtime broadcast.
 * A buyer-authored note uses one rare broadcast to update the appreciation wall.
 *
 * Global storefront presence is intentionally disabled on the Free tier. Only
 * the capped 3D room opens a presence connection.
 */
export function useDropSocial(
  supabase: SupabaseClient,
  dropId: string,
  {
    initialAppreciations = [],
  }: { initialAppreciations?: Appreciation[] } = {},
) {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [appreciations, setAppreciations] = useState(initialAppreciations)
  const [sessionKey] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : presenceKey(),
  )

  const recentEventsRef = useRef<{ paid: boolean; at: number }[]>([])
  const nextIdRef = useRef(1)
  const dismissTimerRef = useRef<number | undefined>(undefined)
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
    const channel = supabase
      .channel(socialTopic(dropId))
      .on('broadcast', { event: 'paid' }, ({ payload }) => {
        const event = payload as SocialEventPayload | undefined
        if (typeof event?.note !== 'string' || !event.note.trim()) return
        showAnnouncement('paid', event)
      })
      .subscribe()

    return () => {
      window.clearTimeout(dismissTimerRef.current)
      void supabase.removeChannel(channel)
    }
  }, [dropId, showAnnouncement, supabase])

  const announcePaid = useCallback(
    (productName: string, qty: number) =>
      showAnnouncement('paid', {
        firstName: 'Someone',
        productName,
        qty,
      }),
    [showAnnouncement],
  )

  return {
    watching: 0,
    announcement,
    appreciations,
    presenceKey: sessionKey,
    announcePaid,
  }
}
