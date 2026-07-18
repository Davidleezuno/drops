import Link from 'next/link'

import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 text-center">
      <h1
        className="animate-rise font-display text-5xl leading-[1.05] font-semibold tracking-tight text-balance"
        style={{ animationDelay: '80ms' }}
      >
        Turn a menu photo into a storefront.
      </h1>
      <p
        className="mt-5 max-w-sm animate-rise text-muted-foreground text-balance"
        style={{ animationDelay: '160ms' }}
      >
        Get a shop link in minutes, with payments, stock, and packing built in.
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
          Create your storefront
        </Button>
        <Button
          size="lg"
          variant="ghost"
          className="w-full"
          nativeButton={false}
          render={<Link href="/rotiwife/tonight" />}
        >
          See an example storefront
        </Button>
      </div>
    </main>
  )
}
