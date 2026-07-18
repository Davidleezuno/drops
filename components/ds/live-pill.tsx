import { cn } from "@/lib/utils"

/**
 * The "this is happening" chip: ink pill with a breathing green dot.
 * Put a Countdown (time-bound drops) or a status word inside. Drops that
 * aren't time-bound simply never render one — urgency comes from data.
 */
export function LivePill({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-foreground py-2 pr-4 pl-3.5 font-mono text-sm text-background tabular-nums",
        className
      )}
    >
      <span className="relative flex size-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-live" />
      </span>
      {children}
    </span>
  )
}
