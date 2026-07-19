import { siteHost } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * The person is the hero (design brief §3): seller name set in the display
 * face, with the drop's URL path as the identity eyebrow — the link *is* the
 * brand. Pass pills (LivePill + Countdown, etc.) as children.
 */
export function DropHeader({
  sellerName,
  sellerSlug,
  dropSlug,
  className,
  children,
}: {
  sellerName: string
  sellerSlug: string
  dropSlug: string
  className?: string
  children?: React.ReactNode
}) {
  return (
    <header className={cn("flex flex-col items-start", className)}>
      <p className="font-mono text-xs text-muted-foreground">
        {siteHost()}/{sellerSlug}/
        <span className="font-medium text-seller-accent">{dropSlug}</span>
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-balance">
        {sellerName}
      </h1>
      {children && <div className="mt-5 flex flex-wrap gap-2">{children}</div>}
    </header>
  )
}
