'use client'

import { cn } from '@/lib/utils'
import type { Announcement } from '@/lib/use-drop-social'

function Quantity({ value }: { value: number }) {
  if (value <= 1) return null
  return (
    <span className="font-mono font-semibold tabular-nums"> ×{value}</span>
  )
}

/**
 * Claim/paid announcements (future-ideas §1b): one bottom-anchored toast in
 * the same material as product cards. Max one visible — new events replace,
 * bursts arrive pre-coalesced from the hook. The flame dot marks money
 * landing and nothing else. Never blocks the active purchase card.
 */
export function SocialToast({
  announcement,
}: {
  announcement: Announcement | null
}) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]"
    >
      {announcement && (
        <div
          key={announcement.id}
          className={cn(
            'flex max-w-sm items-center gap-2.5 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm',
            'motion-safe:animate-rise motion-reduce:animate-none',
          )}
        >
          {(announcement.kind === 'paid' ||
            (announcement.kind === 'summary' && announcement.paid)) && (
            <span
              className="size-1.5 shrink-0 rounded-full bg-flame"
              aria-hidden
            />
          )}
          <p className="truncate text-sm">
            {announcement.kind === 'summary' ? (
              <>
                <span className="font-mono font-semibold tabular-nums">
                  {announcement.count}
                </span>{' '}
                {announcement.paid ? 'sold' : 'claimed'} in the last minute
              </>
            ) : (
              <>
                <span className="font-semibold">{announcement.firstName}</span>{' '}
                just {announcement.kind === 'paid' ? 'bought' : 'claimed'}{' '}
                {announcement.productName}
                <Quantity value={announcement.qty} />
              </>
            )}
          </p>
        </div>
      )}
    </div>
  )
}
