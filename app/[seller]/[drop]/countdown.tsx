'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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

export function Countdown({ endsAt }: { endsAt: string }) {
  const router = useRouter()
  const [remaining, setRemaining] = useState(
    () => new Date(endsAt).getTime() - Date.now(),
  )

  useEffect(() => {
    const timer = setInterval(() => {
      const next = new Date(endsAt).getTime() - Date.now()
      setRemaining(next)
      if (next <= 0) {
        clearInterval(timer)
        // Flip the page to the server-rendered "Drop ended" state.
        router.refresh()
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [endsAt, router])

  return <span>Ends in {formatRemaining(remaining)}</span>
}
