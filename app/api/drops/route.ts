import { randomBytes } from 'node:crypto'

import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'

import { createServiceClient } from '@/lib/db'
import { createDropSchema, slugify } from '@/lib/drop-builder'

export const runtime = 'nodejs'

type CreatedDrop = {
  id: string
  seller_slug: string
  drop_slug: string
  manage_token: string
}

function isOwnedProductShotUrl(value: string | null) {
  if (!value) return true

  try {
    const url = new URL(value)
    const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!)
    return (
      url.origin === supabaseUrl.origin &&
      url.pathname.startsWith(
        '/storage/v1/object/public/product-shots/',
      )
    )
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = createDropSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Check the highlighted drop details and try again.' },
      { status: 400 },
    )
  }

  const input = parsed.data
  const windowEndsAt = new Date(input.windowEndsAt)

  if (input.products.some((product) => !isOwnedProductShotUrl(product.imageUrl))) {
    return NextResponse.json(
      { error: 'One of the product photos is invalid. Add it again and retry.' },
      { status: 400 },
    )
  }

  if (windowEndsAt <= new Date()) {
    return NextResponse.json(
      { error: 'Choose a window end time in the future.' },
      { status: 400 },
    )
  }

  const sellerSlug = slugify(input.sellerName, 'seller')
  const requestedDropSlug = slugify(input.dropSlug, 'drops')
  const manageToken = randomBytes(32).toString('base64url')
  const supabase = createServiceClient()
  let createdDrop: CreatedDrop | null = null
  let lastError: { code?: string; message?: string } | null = null

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const dropSlug =
      attempt === 0
        ? requestedDropSlug
        : `${requestedDropSlug}-${randomBytes(2).toString('hex')}`

    const { data, error } = await supabase
      .from('drops')
      .insert({
        seller_name: input.sellerName,
        seller_slug: sellerSlug,
        drop_slug: dropSlug,
        manage_token: manageToken,
        fulfilment: input.fulfilment,
        delivery_fee:
          input.fulfilment === 'pickup' ? 0 : input.deliveryFee,
        pickup_note:
          input.fulfilment === 'delivery' ? null : input.pickupNote,
        window_ends_at: windowEndsAt.toISOString(),
      })
      .select('id, seller_slug, drop_slug, manage_token')
      .single<CreatedDrop>()

    if (!error && data) {
      createdDrop = data
      break
    }

    lastError = error
    if (error?.code !== '23505') break
  }

  if (!createdDrop) {
    console.error('Failed to create drop', lastError)
    return NextResponse.json(
      { error: 'The drop could not be published. Please try again.' },
      { status: 500 },
    )
  }

  const { error: productsError } = await supabase.from('products').insert(
    input.products.map((product) => ({
      drop_id: createdDrop.id,
      name: product.name,
      variant: product.variant || null,
      image_url: product.imageUrl,
      price: product.price,
      stock_total: product.stock,
    })),
  )

  if (productsError) {
    console.error('Failed to create drop products', productsError)
    const { error: cleanupError } = await supabase
      .from('drops')
      .delete()
      .eq('id', createdDrop.id)
    if (cleanupError) console.error('Failed to clean up empty drop', cleanupError)

    return NextResponse.json(
      { error: 'The drop could not be published. Please try again.' },
      { status: 500 },
    )
  }

  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL
  const origin = configuredAppUrl
    ? new URL(configuredAppUrl).origin
    : request.nextUrl.origin
  const buyerUrl = `${origin}/${createdDrop.seller_slug}/${createdDrop.drop_slug}`
  const manageUrl = `${origin}/manage/${createdDrop.manage_token}`
  const qrDataUrl = await QRCode.toDataURL(buyerUrl, {
    width: 640,
    margin: 1,
    errorCorrectionLevel: 'M',
  })

  return NextResponse.json(
    {
      buyerUrl,
      manageUrl,
      qrDataUrl,
      sellerSlug: createdDrop.seller_slug,
      dropSlug: createdDrop.drop_slug,
    },
    { status: 201, headers: { 'Cache-Control': 'no-store' } },
  )
}
