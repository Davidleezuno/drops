import { ArrowLeft, ArrowUpRight, Store } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import { createServiceClient } from '@/lib/db'
import { dropWindowClosed } from '@/lib/drop-state'
import type { Drop } from '@/lib/types'

export const dynamic = 'force-dynamic'

type StoreProduct = {
  name: string
  image_url: string | null
}

type StoreRow = Pick<
  Drop,
  | 'id'
  | 'seller_name'
  | 'seller_slug'
  | 'drop_slug'
  | 'status'
  | 'window_ends_at'
  | 'created_at'
> & {
  products: StoreProduct[]
}

export default async function StoresPage() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('drops')
    .select(
      'id, seller_name, seller_slug, drop_slug, status, window_ends_at, created_at, products(name, image_url)',
    )
    .order('created_at', { ascending: false })
    .returns<StoreRow[]>()

  if (error) console.error('Failed to load stores', error)

  const stores = (data ?? [])
    .map((store) => ({ ...store, closed: dropWindowClosed(store) }))
    .sort((a, b) => Number(a.closed) - Number(b.closed))

  return (
    <main className="mx-auto min-h-dvh w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Home
        </Link>
        <Link
          href="/new"
          className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          Open a store <ArrowUpRight className="size-4" />
        </Link>
      </header>

      <section className="mt-14 sm:mt-20">
        <p className="font-mono text-xs tracking-[0.18em] text-flame uppercase">
          Store directory
        </p>
        <h1 className="mt-3 max-w-2xl font-display text-5xl font-semibold tracking-tight sm:text-7xl">
          Come in and look around.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted-foreground">
          Browse every store made on Drops. Closed stores stay open for viewing,
          so you can still explore what they had on the shelves.
        </p>
      </section>

      {stores.length ? (
        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => {
            const preview = store.products.find((product) => product.image_url)

            return (
              <li key={store.id}>
                <Link
                  href={`/${store.seller_slug}/${store.drop_slug}`}
                  className="group block overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    {preview?.image_url ? (
                      <Image
                        src={preview.image_url}
                        alt={`${preview.name} from ${store.seller_name}`}
                        fill
                        className={`object-cover transition-transform duration-500 group-hover:scale-[1.03] ${store.closed ? 'grayscale-[35%]' : ''}`}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Store className="size-10 text-muted-foreground/40" />
                      </div>
                    )}
                    <span
                      className={`absolute top-4 left-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-[10px] font-semibold tracking-wider uppercase shadow-sm ${
                        store.closed
                          ? 'bg-foreground text-background'
                          : 'bg-white text-live'
                      }`}
                    >
                      <i
                        className={`size-1.5 rounded-full ${store.closed ? 'bg-background/60' : 'bg-live'}`}
                      />
                      {store.closed ? 'Closed' : 'Open now'}
                    </span>
                  </div>
                  <div className="flex items-end justify-between gap-4 p-5">
                    <div className="min-w-0">
                      <h2 className="truncate font-display text-2xl font-semibold">
                        {store.seller_name}
                      </h2>
                      <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                        /{store.seller_slug}/{store.drop_slug}
                      </p>
                    </div>
                    <ArrowUpRight className="mb-1 size-5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="mt-12 rounded-3xl border border-dashed border-border px-6 py-16 text-center">
          <Store className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-4 font-display text-2xl font-semibold">No stores yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Be the first to put something on the shelves.
          </p>
        </div>
      )}
    </main>
  )
}
