import { cn } from "@/lib/utils"

/**
 * Page container. `drop` is the mobile-first buyer width; `console` is the
 * wider seller-facing width. Every page renders inside a Shell.
 */
export function Shell({
  width = "drop",
  className,
  children,
}: {
  width?: "drop" | "console"
  className?: string
  children: React.ReactNode
}) {
  return (
    <main
      className={cn(
        "mx-auto flex min-h-dvh w-full flex-col px-5 pt-8 pb-16",
        width === "drop" ? "max-w-md" : "max-w-3xl",
        className
      )}
    >
      {children}
    </main>
  )
}
