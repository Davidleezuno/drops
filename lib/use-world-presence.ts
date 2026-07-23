'use client'

import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { worldIdentity } from '@/lib/world/names'

const MAX_WORLD_SHOPPERS = 20
const MOVEMENT_SHARDS = 5
const MOVE_HEARTBEAT_MS = 2_000
const MOVE_STATE_CHANGE_MIN_MS = 1_000

export type WorldPose = {
  x: number
  z: number
  ry: number
  vx?: number
  vz?: number
  receivedAt?: number
}

export type RemoteShopper = {
  key: string
  name: string
  tint: string
}

export function worldTopic(dropId: string) {
  return `drop-${dropId}-world`
}

function worldMovementTopic(dropId: string, shard: number) {
  return `drop-${dropId}-world-move-${shard}`
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
  const vx =
    typeof move.vx === 'number' && Number.isFinite(move.vx) ? move.vx : 0
  const vz =
    typeof move.vz === 'number' && Number.isFinite(move.vz) ? move.vz : 0
  return {
    x: move.x,
    z: move.z,
    ry: move.ry,
    vx,
    vz,
    receivedAt: performance.now(),
  }
}

export function useWorldPresence({
  supabase,
  dropId,
  presenceKey,
  onFull,
}: {
  supabase: SupabaseClient
  dropId: string
  presenceKey: string
  onFull: () => void
}) {
  const identity = useMemo(() => worldIdentity(presenceKey), [presenceKey])
  const [remotes, setRemotes] = useState<RemoteShopper[]>([])
  const [shopperCount, setShopperCount] = useState(0)
  const [admitted, setAdmitted] = useState(false)
  const [movementShard, setMovementShard] = useState<number | null>(null)
  // Poses live outside React state: move broadcasts arrive many times per
  // second and RemoteAvatar reads them in its frame loop, so routing them
  // through setState would re-render the whole canvas tree per message.
  const posesRef = useRef<Map<string, WorldPose>>(new Map())
  const renderedKeysRef = useRef<Set<string>>(new Set())
  const movementChannelRef = useRef<RealtimeChannel | null>(null)
  const readyRef = useRef(false)
  const lastSentAtRef = useRef(0)
  const lastPoseRef = useRef<WorldPose | null>(null)
  const lastMovingRef = useRef(false)
  const joinedAtRef = useRef<number | null>(null)
  const fullNotifiedRef = useRef(false)

  useEffect(() => {
    let channel: RealtimeChannel | undefined
    joinedAtRef.current ??= Date.now()

    try {
      channel = supabase.channel(worldTopic(dropId), {
        config: { presence: { key: presenceKey } },
      })

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel!.presenceState() as unknown as Record<
            string,
            Array<Record<string, unknown>>
          >
          const entries = Object.entries(state)
            .map(([key, metas]) => {
              const meta = metas[0]
              const joinedAt =
                typeof meta?.joinedAt === 'number'
                  ? meta.joinedAt
                  : Number.MAX_SAFE_INTEGER
              return { key, meta, joinedAt }
            })
            .sort(
              (left, right) =>
                left.joinedAt - right.joinedAt ||
                left.key.localeCompare(right.key),
            )
          const admittedEntries = entries.slice(0, MAX_WORLD_SHOPPERS)
          const ownIndex = admittedEntries.findIndex(
            (entry) => entry.key === presenceKey,
          )

          if (ownIndex === -1) {
            setAdmitted(false)
            setMovementShard(null)
            readyRef.current = false
            if (
              entries.some((entry) => entry.key === presenceKey) &&
              !fullNotifiedRef.current
            ) {
              fullNotifiedRef.current = true
              onFull()
            }
            return
          }

          fullNotifiedRef.current = false
          setAdmitted(true)
          setShopperCount(admittedEntries.length)
          const ownMovementShard = ownIndex % MOVEMENT_SHARDS
          setMovementShard(ownMovementShard)

          const rendered = admittedEntries
            .filter(
              (entry, index) =>
                entry.key !== presenceKey &&
                index % MOVEMENT_SHARDS === ownMovementShard,
            )

          renderedKeysRef.current = new Set(rendered.map((entry) => entry.key))
          for (const key of posesRef.current.keys()) {
            if (!renderedKeysRef.current.has(key)) posesRef.current.delete(key)
          }
          rendered.forEach((entry, index) => {
            if (!posesRef.current.has(entry.key)) {
              posesRef.current.set(entry.key, {
                x: ((index % 4) - 1.5) * 0.8,
                z: 3.2 + Math.floor(index / 4) * 0.45,
                ry: 0,
                vx: 0,
                vz: 0,
                receivedAt: performance.now(),
              })
            }
          })

          setRemotes(
            rendered.map((entry) => {
              const fallback = worldIdentity(entry.key)
              return {
                key: entry.key,
                name:
                  typeof entry.meta?.name === 'string'
                    ? entry.meta.name
                    : fallback.name,
                tint:
                  typeof entry.meta?.tint === 'string'
                    ? entry.meta.tint
                    : fallback.tint,
              }
            }),
          )
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            void channel!.track({
              ...identity,
              joinedAt: joinedAtRef.current!,
            })
          }
        })
    } catch (caught) {
      console.warn('World presence unavailable', caught)
    }

    return () => {
      readyRef.current = false
      setAdmitted(false)
      setMovementShard(null)
      if (channel) void supabase.removeChannel(channel)
    }
  }, [dropId, identity, onFull, presenceKey, supabase])

  useEffect(() => {
    if (!admitted || movementShard === null) return

    const channel = supabase
      .channel(worldMovementTopic(dropId, movementShard), {
        config: { broadcast: { self: false } },
      })
      .on('broadcast', { event: 'move' }, ({ payload }) => {
        const key = (payload as { key?: unknown } | undefined)?.key
        if (typeof key !== 'string' || key === presenceKey) return
        if (!renderedKeysRef.current.has(key)) return
        const pose = finitePose(payload)
        if (pose) posesRef.current.set(key, pose)
      })
      .subscribe((status) => {
        readyRef.current = status === 'SUBSCRIBED'
      })

    movementChannelRef.current = channel
    return () => {
      readyRef.current = false
      movementChannelRef.current = null
      void supabase.removeChannel(channel)
    }
  }, [admitted, dropId, movementShard, presenceKey, supabase])

  const broadcastPose = useCallback(
    (pose: WorldPose) => {
      if (!readyRef.current) return
      const now = performance.now()
      const previous = lastPoseRef.current
      const moving = Math.hypot(pose.vx ?? 0, pose.vz ?? 0) > 0.01
      const stateChanged = moving !== lastMovingRef.current
      const elapsed = now - lastSentAtRef.current
      const turned =
        previous !== null && Math.abs(previous.ry - pose.ry) > 0.15
      const shouldSend =
        previous === null ||
        (stateChanged && elapsed >= MOVE_STATE_CHANGE_MIN_MS) ||
        (moving && elapsed >= MOVE_HEARTBEAT_MS) ||
        (turned && elapsed >= MOVE_HEARTBEAT_MS)
      if (!shouldSend) return

      lastSentAtRef.current = now
      lastPoseRef.current = pose
      lastMovingRef.current = moving
      void movementChannelRef.current?.send({
        type: 'broadcast',
        event: 'move',
        payload: { type: 'move', key: presenceKey, ...pose },
      })
    },
    [presenceKey],
  )

  return {
    admitted,
    identity,
    remotes,
    shopperCount,
    remotePoses: posesRef,
    broadcastPose,
  }
}
