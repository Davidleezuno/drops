import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { siteHost } from '@/lib/format'

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="animate-rise font-mono text-xs tracking-widest text-primary uppercase">
        {siteHost()}
      </p>
      <h1
        className="mt-4 animate-rise font-display text-5xl leading-[1.05] font-semibold tracking-tight text-balance"
        style={{ animationDelay: '80ms' }}
      >
        Storefronts for people, not corporations.
      </h1>
      <p
        className="mt-5 max-w-sm animate-rise text-muted-foreground text-balance"
        style={{ animationDelay: '160ms' }}
      >
        Photograph your menu, get a link in a minute. Buyers pay you directly,
        stock counts itself down, and you end with a packing list.
      </p>
      <div
        className="mt-8 flex w-full max-w-xs animate-rise flex-col gap-2"
        style={{ animationDelay: '240ms' }}
      >
        <Button
          size="lg"
          className="h-12 w-full"
          nativeButton={false}
          render={<Link href="/new" />}
        >
          Create a drop
        </Button>
        <Button
          size="lg"
          variant="ghost"
          className="w-full"
          nativeButton={false}
          render={<Link href="/rotiwife/tonight" />}
        >
          See an example drop
        </Button>
      </div>
    </main>
  )
}
