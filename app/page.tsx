import Link from 'next/link'

import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="animate-rise font-mono text-xs tracking-widest text-primary uppercase">
        drops.sg
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
        Spin up a drop in a minute — tonight&rsquo;s bake, a live sale, a
        standing partnership link. Share one URL. It sells, settles, and
        reconciles itself.
      </p>
      <div
        className="mt-8 flex animate-rise items-center gap-3"
        style={{ animationDelay: '240ms' }}
      >
        <Button size="lg" render={<Link href="/rotiwife/tonight" />}>
          See a live drop
        </Button>
        <Button size="lg" variant="ghost" disabled>
          Create a drop — soon
        </Button>
      </div>
    </main>
  )
}
