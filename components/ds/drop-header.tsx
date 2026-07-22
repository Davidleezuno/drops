import { siteHost } from "@/lib/format"
import { cn } from "@/lib/utils"

import { ShareStorefrontButton } from "./share-storefront-button"

/**
 * The person is the hero (design brief §3): seller name set in the display
 * face, with the drop's URL path as the identity eyebrow — the link *is* the
 * brand. Status children sit quietly in the top-right so discovery remains
 * the primary action.
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
      <div className="flex w-full items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-0.5">
          <p className="truncate font-mono text-xs text-muted-foreground">
            {siteHost()}/{sellerSlug}/
            <span className="font-medium text-seller-accent">{dropSlug}</span>
          </p>
          <ShareStorefrontButton title={`${sellerName} storefront`} />
        </div>
        {children && (
          <div className="flex shrink-0 flex-col items-end gap-2 pt-2">
            {children}
          </div>
        )}
      </div>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-balance">
        {sellerName}
      </h1>
    </header>
  )
}
