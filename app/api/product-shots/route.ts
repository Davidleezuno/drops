import { randomUUID } from 'node:crypto'

import { generateText } from 'ai'
import { NextResponse } from 'next/server'

import { createServiceClient } from '@/lib/db'

export const maxDuration = 60
export const runtime = 'nodejs'

const BUCKET = 'product-shots'
const DEFAULT_MODEL = 'google/gemini-3.1-flash-image'
const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const IMAGE_GENERATION_TIMEOUT_MS = 45_000
const ALLOWED_MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function storageExtension(mediaType: string) {
  if (mediaType === 'image/jpeg') return 'jpg'
  if (mediaType === 'image/webp') return 'webp'
  return 'png'
}

function cleanField(value: FormDataEntryValue | null, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function isOwnedProductShotUrl(value: string) {
  try {
    const url = new URL(value)
    const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!)
    return (
      url.origin === supabaseUrl.origin &&
      url.pathname.startsWith(
        `/storage/v1/object/public/${BUCKET}/`,
      )
    )
  } catch {
    return false
  }
}

async function readReferenceImage(formData: FormData) {
  const uploadedImage = formData.get('image')
  if (
    uploadedImage instanceof File &&
    uploadedImage.size > 0 &&
    uploadedImage.size <= MAX_IMAGE_BYTES &&
    ALLOWED_MEDIA_TYPES.has(uploadedImage.type)
  ) {
    return new Uint8Array(await uploadedImage.arrayBuffer())
  }

  const referenceUrl = cleanField(formData.get('referenceUrl'), 2_000)
  if (!referenceUrl || !isOwnedProductShotUrl(referenceUrl)) return null

  const response = await fetch(referenceUrl, { cache: 'no-store' })
  if (!response.ok) return null

  const contentType = response.headers.get('content-type')?.split(';')[0]
  const contentLength = Number(response.headers.get('content-length') || 0)
  if (
    !contentType ||
    !ALLOWED_MEDIA_TYPES.has(contentType) ||
    contentLength > MAX_IMAGE_BYTES
  ) {
    return null
  }

  const bytes = new Uint8Array(await response.arrayBuffer())
  return bytes.byteLength <= MAX_IMAGE_BYTES ? bytes : null
}

async function saveProductShot(bytes: Uint8Array, mediaType: string) {
  const supabase = createServiceClient()
  const extension = storageExtension(mediaType)
  const path = `drafts/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    cacheControl: '31536000',
    contentType: mediaType,
    upsert: false,
  })

  if (error) throw new Error(`Could not store product shot: ${error.message}`)

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null)
  if (!formData) {
    return NextResponse.json({ error: 'Invalid product shot request.' }, { status: 400 })
  }

  const mode = cleanField(formData.get('mode'), 20)
  const uploadedImage = formData.get('image')

  if (mode === 'upload') {
    if (
      !(uploadedImage instanceof File) ||
      uploadedImage.size === 0 ||
      uploadedImage.size > MAX_IMAGE_BYTES ||
      !ALLOWED_MEDIA_TYPES.has(uploadedImage.type)
    ) {
      return NextResponse.json(
        { error: 'Choose a JPG, PNG, or WebP image smaller than 4 MB.' },
        { status: 400 },
      )
    }

    try {
      const imageUrl = await saveProductShot(
        new Uint8Array(await uploadedImage.arrayBuffer()),
        uploadedImage.type,
      )
      return NextResponse.json({ imageUrl, source: 'uploaded' })
    } catch (error) {
      console.error('Product image upload failed', error)
      return NextResponse.json(
        { error: 'We could not save that photo. Please try again.' },
        { status: 502 },
      )
    }
  }

  const name = cleanField(formData.get('name'), 120)
  const variant = cleanField(formData.get('variant'), 120)
  const previewOnly = mode === 'preview'
  if (!name && !previewOnly) {
    return NextResponse.json(
      { error: 'Add a product name before improving its photo.' },
      { status: 400 },
    )
  }

  try {
    const referenceImage = await readReferenceImage(formData)
    if (previewOnly && !referenceImage) {
      return NextResponse.json(
        { error: 'Choose a source photo to improve.' },
        { status: 400 },
      )
    }

    const productDescription = name
      ? variant
        ? `${name}, ${variant}`
        : name
      : 'the primary sellable product or set shown in the reference image'
    const prompt = [
      `Create a polished square ecommerce product photograph for: ${productDescription}.`,
      referenceImage
        ? 'Use the reference image to preserve the exact product identity, packaging, colors, proportions, quantity, and any visible branding.'
        : 'Create an honest, realistic representation of the named product without inventing branding or claims.',
      previewOnly
        ? 'If the reference shows several items that form one set, keep the complete set together. Do not select, merge, or invent products that are not shown.'
        : '',
      'Show one clear hero view, centered and fully in frame, on a warm off-white studio background with soft natural light and a subtle grounded shadow.',
      'Remove hands, people, clutter, price tags, watermarks, frames, and unrelated objects.',
      'Do not add captions, promotional copy, decorative typography, new logos, or extra packaging text.',
      'The result should feel like a premium but truthful seller storefront photo, not an advertisement mockup.',
    ].join(' ')

    const result = await generateText({
      model: DEFAULT_MODEL,
      prompt: referenceImage
        ? [
            {
              role: 'user',
              content: [
                { type: 'image', image: referenceImage },
                { type: 'text', text: prompt },
              ],
            },
          ]
        : prompt,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(IMAGE_GENERATION_TIMEOUT_MS),
      providerOptions: {
        google: {
          responseModalities: ['TEXT', 'IMAGE'],
          thinkingConfig: {
            thinkingLevel: 'minimal',
          },
          imageConfig: {
            aspectRatio: '1:1',
            imageSize: '1K',
          },
        },
        gateway: {
          tags: ['feature:product-shot'],
        },
      },
    })

    const generated = result.files.find((file) =>
      file.mediaType.startsWith('image/'),
    )
    if (!generated) throw new Error('The image model returned no image.')

    const mediaType = ALLOWED_MEDIA_TYPES.has(generated.mediaType)
      ? generated.mediaType
      : 'image/png'

    if (previewOnly) {
      return new Response(generated.uint8Array.slice().buffer, {
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': mediaType,
          'X-Product-Shot-Source': 'preview',
        },
      })
    }

    const imageUrl = await saveProductShot(generated.uint8Array, mediaType)

    return NextResponse.json({ imageUrl, source: 'generated' })
  } catch (error) {
    console.error('Product shot generation failed', error)
    return NextResponse.json(
      {
        error:
          'We could not improve that product shot right now. Your original details are still safe.',
      },
      { status: 502 },
    )
  }
}
