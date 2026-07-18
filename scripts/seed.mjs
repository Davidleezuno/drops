// Seed a fresh demo drop in one command: `npm run seed`
// Re-running resets the demo drop to a fresh window and full stock.
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

const SELLER_SLUG = 'rotiwife'
const DROP_SLUG = 'tonight'

const PRODUCTS = [
  { name: 'Set A', variant: 'Curry chicken + 2 roti prata', price: 35, stock_total: 6 },
  { name: 'Set B', variant: 'Family feast — curry chicken, murtabak, 4 roti prata', price: 65, stock_total: 4 },
  { name: 'Teh Tarik', variant: '1L bottle', price: 8, stock_total: 2 },
]

// Fresh window every run: 6 hours from now.
const windowEndsAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()

const { data: drop, error: dropError } = await supabase
  .from('drops')
  .upsert(
    {
      seller_name: 'Roti Wife',
      seller_slug: SELLER_SLUG,
      drop_slug: DROP_SLUG,
      manage_token: randomBytes(32).toString('hex'),
      fulfilment: 'both',
      delivery_fee: 5,
      pickup_note: 'Blk 123 Hougang Ave 1 — exact unit shared after payment',
      window_ends_at: windowEndsAt,
      status: 'live',
    },
    { onConflict: 'seller_slug,drop_slug' },
  )
  .select()
  .single()

if (dropError) {
  console.error('Failed to seed drop:', dropError.message)
  process.exit(1)
}

// Reset products (also orphans any seeded orders from previous runs).
await supabase.from('orders').delete().in(
  'product_id',
  (await supabase.from('products').select('id').eq('drop_id', drop.id)).data?.map((p) => p.id) ?? [],
)
await supabase.from('products').delete().eq('drop_id', drop.id)

const { error: productsError } = await supabase
  .from('products')
  .insert(PRODUCTS.map((p) => ({ ...p, drop_id: drop.id })))

if (productsError) {
  console.error('Failed to seed products:', productsError.message)
  process.exit(1)
}

console.log(`Seeded drop "${drop.seller_name} / ${DROP_SLUG}" (${PRODUCTS.length} products, ends ${windowEndsAt})`)
console.log(`\nBuyer link:   ${APP_URL}/${SELLER_SLUG}/${DROP_SLUG}`)
console.log(`Console link: ${APP_URL}/manage/${drop.manage_token}  (keep secret)`)
