// Seed fresh 3D demo drops in one command: `pnpm seed`
// Re-running resets each demo drop to a fresh window and full stock.
// Two sellers on purpose: a warm F&B store and a hype merch store —
// proof that one template + theme skin produces visibly different worlds.
import { createClient } from '@supabase/supabase-js'
import { readFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const PREVIEW_URL = process.env.SEED_APP_URL ?? 'http://localhost:3000'
const PRODUCT_SHOTS_BUCKET = 'product-shots'

const DROPS = [
  {
    sellerSlug: 'rotiwife',
    dropSlug: 'tonight',
    sellerName: 'Roti Wife',
    fulfilment: 'both',
    deliveryFee: 5,
    pickupNote: 'Blk 123 Hougang Ave 1 — exact unit shared after payment',
    shots: [
      { filename: 'set-a.jpeg', source: '../docs/test-images/set_1.jpeg', contentType: 'image/jpeg' },
      { filename: 'set-b.jpeg', source: '../docs/test-images/set_2.jpeg', contentType: 'image/jpeg' },
    ],
    products: [
      { name: 'Set A', variant: 'Curry chicken + 2 roti prata', price: 35, stock_total: 6 },
      { name: 'Set B', variant: 'Family feast — curry chicken, murtabak, 4 roti prata', price: 65, stock_total: 4 },
      { name: 'Teh Tarik', variant: '1L bottle', price: 8, stock_total: 2 },
    ],
    theme: {
      accent: { l: 0.56, c: 0.15, h: 48 },
      archetype: 'menu',
      vertical: 'fnb',
      hero: {
        source: 'upload-crop',
        sourceImageIndex: 0,
        crop: { x: 0, y: 0, w: 1, h: 0.4375 },
      },
      voice: {
        dropTitle: "Tonight's Roti Supper",
        sellerNote: 'Hot prata, curry and teh tarik — while stocks last.',
        tone: 'warm',
      },
      ogCard: {
        headline: 'Roti supper is live',
        badge: 'Tonight only',
      },
    },
  },
  {
    sellerSlug: 'sundaystudio',
    dropSlug: 'launch',
    sellerName: 'Sunday Studio',
    fulfilment: 'both',
    deliveryFee: 4,
    pickupNote: 'Weekend pickup at Everton Park — slot shared after payment',
    shots: [
      { filename: 'studio-tee.png', source: '../docs/test-images/fashion-studio-sunday.png', contentType: 'image/png' },
    ],
    products: [
      { name: 'Studio Tee', variant: 'Heavyweight 240gsm, boxy cut', price: 32, stock_total: 10 },
      { name: 'Zip Hoodie', variant: 'Brushed fleece, embroidered logo', price: 68, stock_total: 6 },
      { name: 'Sticker Pack', variant: '6 die-cut stickers', price: 8, stock_total: 20 },
    ],
    theme: {
      accent: { l: 0.58, c: 0.19, h: 268 },
      archetype: 'grid',
      vertical: 'fashion',
      hero: {
        source: 'upload-crop',
        sourceImageIndex: 0,
        crop: { x: 0, y: 0, w: 1, h: 0.4375 },
      },
      voice: {
        dropTitle: 'Sunday Studio Launch',
        sellerNote: 'First run of the studio merch — numbered, no restock.',
        tone: 'hype',
      },
      ogCard: {
        headline: 'The first drop is live',
        badge: 'No restock',
      },
    },
  },
]

async function uploadSeedShot(sellerSlug, shot) {
  const bytes = await readFile(new URL(shot.source, import.meta.url))
  const storagePath = `seed/${sellerSlug}/${shot.filename}`
  const { error } = await supabase.storage
    .from(PRODUCT_SHOTS_BUCKET)
    .upload(storagePath, bytes, {
      contentType: shot.contentType,
      cacheControl: '3600',
      upsert: true,
    })

  if (error) {
    console.error(`Failed to upload ${shot.filename}:`, error.message)
    process.exit(1)
  }

  return supabase.storage.from(PRODUCT_SHOTS_BUCKET).getPublicUrl(storagePath)
    .data.publicUrl
}

async function seedDrop(config) {
  const imageUrls = await Promise.all(
    config.shots.map((shot) => uploadSeedShot(config.sellerSlug, shot)),
  )

  // Fresh window every run: 6 hours from now.
  const windowEndsAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()

  const { data: drop, error: dropError } = await supabase
    .from('drops')
    .upsert(
      {
        seller_name: config.sellerName,
        seller_slug: config.sellerSlug,
        drop_slug: config.dropSlug,
        manage_token: randomBytes(32).toString('hex'),
        fulfilment: config.fulfilment,
        delivery_fee: config.deliveryFee,
        pickup_note: config.pickupNote,
        window_ends_at: windowEndsAt,
        status: 'live',
        theme: config.theme,
      },
      { onConflict: 'seller_slug,drop_slug' },
    )
    .select()
    .single()

  if (dropError) {
    console.error(`Failed to seed drop ${config.sellerSlug}:`, dropError.message)
    process.exit(1)
  }

  // Reset products (also orphans any seeded orders from previous runs).
  await supabase.from('orders').delete().in(
    'product_id',
    (await supabase.from('products').select('id').eq('drop_id', drop.id)).data?.map((p) => p.id) ?? [],
  )
  await supabase.from('products').delete().eq('drop_id', drop.id)

  const { data: seededProducts, error: productsError } = await supabase
    .from('products')
    .insert(
      config.products.map((product, index) => ({
        ...product,
        drop_id: drop.id,
        image_url: imageUrls[index % imageUrls.length],
      })),
    )
    .select('id, price, stock_total')

  if (productsError) {
    console.error(`Failed to seed products for ${config.sellerSlug}:`, productsError.message)
    process.exit(1)
  }

  const { error: variantsError } = await supabase
    .from('product_variants')
    .insert(
      seededProducts.map((product) => ({
        product_id: product.id,
        label: null,
        price: product.price,
        stock_total: product.stock_total,
      })),
    )

  if (variantsError) {
    console.error(`Failed to seed variants for ${config.sellerSlug}:`, variantsError.message)
    process.exit(1)
  }

  console.log(
    `Seeded drop "${drop.seller_name} / ${config.dropSlug}" (${config.products.length} products, ends ${windowEndsAt})`,
  )
  console.log(`  Buyer link:   ${PREVIEW_URL}/${config.sellerSlug}/${config.dropSlug}`)
  console.log(`  Console link: ${PREVIEW_URL}/manage/${drop.manage_token}  (keep secret)`)
}

for (const config of DROPS) {
  await seedDrop(config)
}
