'use client'

import { Html } from '@react-three/drei'

import type { Announcement } from '@/lib/use-drop-social'

function announcementLine(announcement: Announcement | null) {
  if (!announcement) return null
  if (announcement.kind === 'summary') {
    return announcement.paid
      ? null
      : `${announcement.count} claimed in the last minute`
  }
  if (announcement.kind === 'paid') return null
  const quantity = announcement.qty > 1 ? ` ×${announcement.qty}` : ''
  return `${announcement.firstName} claimed ${announcement.productName}${quantity}`
}

export function WallTicker({
  announcement,
  position = [0, 1.45, -4.55],
}: {
  announcement: Announcement | null
  position?: [number, number, number]
}) {
  const line = announcementLine(announcement)
  if (!line) return null

  return (
    <Html
      center
      position={position}
      distanceFactor={4.5}
      style={{ pointerEvents: 'none' }}
    >
      <div
        key={announcement?.id ?? line}
        className="motion-safe:animate-rise w-72 rounded-full border border-white/10 bg-[#2d2925]/95 px-4 py-2 text-center font-mono text-[10px] tracking-wide text-white shadow-lg"
      >
        {line}
      </div>
    </Html>
  )
}
