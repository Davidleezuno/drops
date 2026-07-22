import { randomBytes } from 'node:crypto'

import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'

import { createServiceClient } from '@/lib/db'
import {
  createDropSchema,
  slugify,
  type StorefrontTheme,
} from '@/lib/drop-builder'
import { clampTheme } from '@/lib/theme'

export const runtime = 'nodejs'

type CreatedDrop = {
  id: string
  seller_slug: string
  drop_slug: string
  manage_token: string
}

type ProductVariantInsert = {
  product_id: string
  label: string | null
  price: number
  stock_total: number | null
  position: number
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

function clampSubmittedTheme(body: unknown) {
  if (!body || typeof body !== 'object' || !('theme' in body)) return body
  if (body.theme === null || body.theme === undefined) return body

  try {
    return {
      ...body,
      theme: clampTheme(body.theme as StorefrontTheme),
    }
  } catch {
    return body
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = createDropSchema.safeParse(clampSubmittedTheme(body))

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Check the highlighted drop details and try again.' },
      { status: 400 },
    )
  }

  const input = parsed.data
  const theme = input.theme ? clampTheme(input.theme) : null
  const windowEndsAt = input.windowEndsAt ? new Date(input.windowEndsAt) : null

  if (input.products.some((product) => !isOwnedProductShotUrl(product.imageUrl))) {
    return NextResponse.json(
      { error: 'One of the product photos is invalid. Add it again and retry.' },
      { status: 400 },
    )
  }

  if (windowEndsAt && windowEndsAt <= new Date()) {
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
        window_ends_at: windowEndsAt ? windowEndsAt.toISOString() : null,
        theme,
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

  const productRows = input.products.map((product) => {
    const inventory = product.inventoryChoice?.variants
    const stockTotal = inventory
      ? inventory.some((variant) => variant.stock === null)
        ? null
        : inventory.reduce((sum, variant) => sum + (variant.stock ?? 0), 0)
      : product.stock
    const price = inventory
      ? Math.min(...inventory.map((variant) => variant.price))
      : product.price

    return {
      drop_id: createdDrop.id,
      name: product.name,
      variant: product.variant || null,
      image_url: product.imageUrl,
      display_kind: product.displayKind,
      price,
      stock_total: stockTotal,
      inventory_choice_name: product.inventoryChoice?.name ?? null,
      customization_groups: product.customizations,
    }
  })

  const { data: createdProducts, error: productsError } = await supabase
    .from('products')
    .insert(productRows)
    .select('id')
    .returns<Array<{ id: string }>>()

  if (productsError || createdProducts?.length !== input.products.length) {
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

  const persistedProducts = createdProducts ?? []
  const variantRows = input.products.flatMap<ProductVariantInsert>((product, productIndex) => {
    const productId = persistedProducts[productIndex].id
    return product.inventoryChoice
      ? product.inventoryChoice.variants.map((variant, position) => ({
          product_id: productId,
          label: variant.label,
          price: variant.price,
          stock_total: variant.stock,
          position,
        }))
      : [
          {
            product_id: productId,
            label: null,
            price: product.price,
            stock_total: product.stock,
            position: 0,
          },
        ]
  })

  const { error: variantsError } = await supabase
    .from('product_variants')
    .insert(variantRows)

  if (variantsError) {
    console.error('Failed to create product variants', variantsError)
    await supabase.from('products').delete().eq('drop_id', createdDrop.id)
    await supabase.from('drops').delete().eq('id', createdDrop.id)
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
