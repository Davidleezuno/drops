'use client'

import { useEffect, useState } from 'react'

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
  }
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`
}

export function Countdown({
  endsAt,
  onEnd,
}: {
  endsAt: string
  onEnd: () => void
}) {
  const [remaining, setRemaining] = useState(
    () => new Date(endsAt).getTime() - Date.now(),
  )

  useEffect(() => {
    const deadline = new Date(endsAt).getTime()
    const tick = () => {
      const next = deadline - Date.now()
      setRemaining(next)
    }

    const ticker = window.setInterval(tick, 1000)
    const endTimer = window.setTimeout(() => {
      setRemaining(0)
      onEnd()
    }, Math.max(0, deadline - Date.now()))

    return () => {
      window.clearInterval(ticker)
      window.clearTimeout(endTimer)
    }
  }, [endsAt, onEnd])

  return <span>Ends in {formatRemaining(remaining)}</span>
}
