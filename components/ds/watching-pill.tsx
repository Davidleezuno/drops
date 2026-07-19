import { Eye } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Live viewer count (future-ideas §1a): ambient status beside the LivePill,
 * never inside it. The crowd speaks the same typographic language as stock —
 * mono, tabular, ticking. Below 3 watchers it renders nothing; "1 watching"
 * is worse than silence.
 */
export function WatchingPill({
  count,
  className,
}: {
  count: number
  className?: string
}) {
  if (count < 3) return null

  return (
    <span
      className={cn(
        "animate-rise inline-flex items-center gap-1.5 rounded-full bg-secondary py-2 pr-4 pl-3.5 font-mono text-sm text-secondary-foreground tabular-nums",
        className
      )}
    >
      <Eye className="size-3.5 text-muted-foreground" aria-hidden />
      <span key={count} className="inline-block animate-tick">
        {count}
      </span>{" "}
      watching
    </span>
  )
}
