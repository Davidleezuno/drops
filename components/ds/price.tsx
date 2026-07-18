import { sgd } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Money is always mono + tabular so ticking totals never jitter. */
export function Price({
  amount,
  className,
}: {
  amount: number
  className?: string
}) {
  return (
    <span
      className={cn(
        "font-mono text-sm font-medium tracking-tight tabular-nums",
        className
      )}
    >
      {sgd.format(amount)}
    </span>
  )
}
