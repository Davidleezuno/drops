import { cn } from "@/lib/utils"

import type { OrderStatus } from "@/lib/types"

const styles: Record<OrderStatus, { label: string; className: string }> = {
  PENDING: {
    label: "Awaiting payment",
    className: "bg-secondary text-muted-foreground",
  },
  PAID: {
    label: "Paid",
    className: "bg-live-soft text-live",
  },
  // The one alarm in the product: real money after sellout → refund.
  PAID_LATE: {
    label: "Paid late — refund",
    className: "bg-alarm text-primary-foreground",
  },
}

export function StatusPill({
  status,
  className,
}: {
  status: OrderStatus
  className?: string
}) {
  const s = styles[status]
  return (
    <span
      data-status={status}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-3 py-1 font-mono text-xs font-semibold",
        s.className,
        className
      )}
    >
      {s.label}
    </span>
  )
}
