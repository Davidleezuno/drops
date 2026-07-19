import { cn } from "@/lib/utils"

export type StockState = "plenty" | "low" | "soldout"

export const LOW_STOCK_THRESHOLD = 3

export function stockState(remaining: number): StockState {
  if (remaining <= 0) return "soldout"
  if (remaining <= LOW_STOCK_THRESHOLD) return "low"
  return "plenty"
}

/**
 * The scarcity escalation ladder (design brief §4.1): at full stock the count
 * recedes to quiet inventory info; low stock turns it amber; sold out is ink.
 * Realtime updates (ticket 03) re-mount with a `key` on `remaining` to fire
 * the tick animation.
 *
 * Uncapped products (`remaining === null`, future-ideas §3) flip to the
 * `sold` mode: social proof compounded over time, same mono/tick language,
 * same honesty bar (paid orders only).
 */
export function StockBadge({
  remaining,
  sold = 0,
  className,
}: {
  remaining: number | null
  sold?: number
  className?: string
}) {
  if (remaining === null) {
    if (sold <= 0) return null
    return (
      <span
        data-state="sold"
        className={cn(
          "inline-flex shrink-0 items-center font-mono text-xs font-semibold text-foreground tabular-nums",
          className
        )}
      >
        {sold} sold
      </span>
    )
  }

  const state = stockState(remaining)

  if (state === "soldout") {
    return (
      <span
        data-state={state}
        className={cn(
          "inline-flex shrink-0 items-center rounded-full bg-foreground px-3 py-1 font-mono text-xs font-semibold tracking-widest text-background uppercase",
          className
        )}
      >
        Sold out
      </span>
    )
  }

  if (state === "low") {
    return (
      <span
        data-state={state}
        className={cn(
          "inline-flex shrink-0 items-center gap-1 rounded-full bg-low-soft px-3 py-1 font-mono text-xs font-semibold text-low tabular-nums",
          className
        )}
      >
        only {remaining} left
      </span>
    )
  }

  return (
    <span
      data-state={state}
      className={cn(
        "inline-flex shrink-0 items-center font-mono text-xs text-muted-foreground tabular-nums",
        className
      )}
    >
      {remaining} left
    </span>
  )
}
