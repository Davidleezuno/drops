import { cn } from "@/lib/utils"

type PosterVariant = "sold-out" | "ended" | "paid"

const variants: Record<PosterVariant, { card: string; title: string }> = {
  // The demo's money shot: ink poster, paper type, slight stamp tilt.
  "sold-out": {
    card: "bg-foreground text-background",
    title: "-rotate-2 uppercase",
  },
  ended: {
    card: "border border-border bg-card text-foreground",
    title: "",
  },
  paid: {
    card: "bg-live-soft text-live",
    title: "",
  },
}

/**
 * Full-width terminal states, designed as compositions rather than error
 * messages (design brief §5): SOLD OUT, Drop ended, and Paid.
 */
export function Poster({
  variant,
  title,
  className,
  children,
}: {
  variant: PosterVariant
  title: string
  className?: string
  children?: React.ReactNode
}) {
  const v = variants[variant]
  return (
    <div
      data-variant={variant}
      className={cn(
        "flex animate-rise flex-col items-center justify-center gap-3 rounded-3xl px-6 py-16 text-center",
        v.card,
        className
      )}
    >
      <p
        className={cn(
          "font-display text-5xl leading-none font-black tracking-tight text-balance",
          v.title
        )}
      >
        {title}
      </p>
      {children && (
        <div className="max-w-xs text-sm text-current/70">{children}</div>
      )}
    </div>
  )
}
