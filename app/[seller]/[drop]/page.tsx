import { notFound } from 'next/navigation'

import { Shell } from '@/components/ds/shell'
import { createServiceClient } from '@/lib/db'
import type { Drop, Product } from '@/lib/types'

import { DropStorefront } from './drop-storefront'

export const dynamic = 'force-dynamic'

export default async function DropPage({
  params,
}: {
  params: Promise<{ seller: string; drop: string }>
}) {
  const { seller, drop: dropSlug } = await params
  const supabase = createServiceClient()

  const { data: drop } = await supabase
    .from('drops')
    .select('*')
    .eq('seller_slug', seller)
    .eq('drop_slug', dropSlug)
    .maybeSingle<Drop>()

  if (!drop) notFound()

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('drop_id', drop.id)
    .order('price', { ascending: false })
    .returns<Product[]>()

  const initialEnded =
    drop.status === 'ended' || new Date(drop.window_ends_at) <= new Date()

  return (
    <Shell>
      <DropStorefront
        drop={drop}
        initialProducts={products ?? []}
        initialEnded={initialEnded}
      />

      <footer className="mt-auto pt-12 text-center">
        <p className="font-mono text-xs text-muted-foreground/60">
          a <span className="font-display text-sm italic">Drops</span>{' '}
          storefront
        </p>
      </footer>
    </Shell>
  )
}
