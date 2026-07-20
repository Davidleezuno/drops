'use client'

import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { worldIdentity } from '@/lib/world/names'

// Low send rate + client-side interpolation (see RemoteAvatar): 50 shoppers at
// 3.3Hz stays under Supabase Realtime message-rate limits where 10Hz would not.
const MOVE_INTERVAL_MS = 300
const MAX_RENDERED_REMOTES = 16

export type WorldPose = { x: number; z: number; ry: number }

export type RemoteShopper = {
  key: string
  name: string
  tint: string
}

export function worldTopic(dropId: string) {
  return `drop-${dropId}-world`
}

function finitePose(payload: unknown): WorldPose | null {
  const move = payload as Partial<WorldPose> | undefined
  if (
    typeof move?.x !== 'number' ||
    typeof move.z !== 'number' ||
    typeof move.ry !== 'number' ||
    !Number.isFinite(move.x) ||
    !Number.isFinite(move.z) ||
    !Number.isFinite(move.ry)
  ) {
    return null
  }
  return { x: move.x, z: move.z, ry: move.ry }
}

export function useWorldPresence({
  supabase,
  dropId,
  presenceKey,
}: {
  supabase: SupabaseClient
  dropId: string
  presenceKey: string
}) {
  const identity = useMemo(() => worldIdentity(presenceKey), [presenceKey])
  const [remotes, setRemotes] = useState<RemoteShopper[]>([])
  const [shopperCount, setShopperCount] = useState(1)
  // Poses live outside React state: move broadcasts arrive many times per
  // second and RemoteAvatar reads them in its frame loop, so routing them
  // through setState would re-render the whole canvas tree per message.
  const posesRef = useRef<Map<string, WorldPose>>(new Map())
  const renderedKeysRef = useRef<Set<string>>(new Set())
  const channelRef = useRef<RealtimeChannel | null>(null)
  const readyRef = useRef(false)
  const lastSentAtRef = useRef(0)
  const lastPoseRef = useRef<WorldPose | null>(null)

  useEffect(() => {
    let channel: RealtimeChannel | undefined

    try {
      channel = supabase.channel(worldTopic(dropId), {
        config: {
          presence: { key: presenceKey },
          broadcast: { self: false },
        },
      })

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel!.presenceState() as unknown as Record<
            string,
            Array<Record<string, unknown>>
          >
          const entries = Object.entries(state)
          setShopperCount(Math.max(1, entries.length))

          const rendered = entries
            .filter(([key]) => key !== presenceKey)
            .slice(0, MAX_RENDERED_REMOTES)

          renderedKeysRef.current = new Set(rendered.map(([key]) => key))
          for (const key of posesRef.current.keys()) {
            if (!renderedKeysRef.current.has(key)) posesRef.current.delete(key)
          }
          rendered.forEach(([key], index) => {
            if (!posesRef.current.has(key)) {
              posesRef.current.set(key, {
                x: ((index % 4) - 1.5) * 0.8,
                z: 3.2 + Math.floor(index / 4) * 0.45,
                ry: 0,
              })
            }
          })

          setRemotes(
            rendered.map(([key, metas]) => {
              const meta = metas[0]
              const fallback = worldIdentity(key)
              return {
                key,
                name: typeof meta?.name === 'string' ? meta.name : fallback.name,
                tint: typeof meta?.tint === 'string' ? meta.tint : fallback.tint,
              }
            }),
          )
        })
        .on('broadcast', { event: 'move' }, ({ payload }) => {
          const key = (payload as { key?: unknown } | undefined)?.key
          if (typeof key !== 'string' || key === presenceKey) return
          if (!renderedKeysRef.current.has(key)) return
          const pose = finitePose(payload)
          if (pose) posesRef.current.set(key, pose)
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            readyRef.current = true
            void channel!.track({ ...identity, joinedAt: new Date().toISOString() })
          }
        })

      channelRef.current = channel
    } catch (caught) {
      console.warn('World presence unavailable', caught)
    }

    return () => {
      readyRef.current = false
      channelRef.current = null
      if (channel) void supabase.removeChannel(channel)
    }
  }, [dropId, identity, presenceKey, supabase])

  const broadcastPose = useCallback(
    (pose: WorldPose) => {
      if (!readyRef.current) return
      const now = performance.now()
      const previous = lastPoseRef.current
      const unchanged =
        previous &&
        Math.abs(previous.x - pose.x) < 0.002 &&
        Math.abs(previous.z - pose.z) < 0.002 &&
        Math.abs(previous.ry - pose.ry) < 0.002
      if (unchanged || now - lastSentAtRef.current < MOVE_INTERVAL_MS) return

      lastSentAtRef.current = now
      lastPoseRef.current = pose
      void channelRef.current?.send({
        type: 'broadcast',
        event: 'move',
        payload: { type: 'move', key: presenceKey, ...pose },
      })
    },
    [presenceKey],
  )

  return { identity, remotes, shopperCount, remotePoses: posesRef, broadcastPose }
}
