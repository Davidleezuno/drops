import { generateText, Output } from 'ai'
import { NextResponse } from 'next/server'

import { extractedMenuSchema } from '@/lib/drop-builder'

export const maxDuration = 30
export const runtime = 'nodejs'

const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const MAX_IMAGE_COUNT = 5
const MAX_TOTAL_IMAGE_BYTES = 4 * 1024 * 1024
const DEFAULT_MODEL = 'openai/gpt-5.6-terra'
const DEFAULT_FALLBACK_MODEL = 'anthropic/claude-sonnet-4.6'

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null)
  const submittedImages = formData?.getAll('images') ?? []
  const legacyImage = formData?.get('image')
  const images = submittedImages.length
    ? submittedImages
    : legacyImage
      ? [legacyImage]
      : []

  if (
    !images.length ||
    images.some(
      (image) =>
        !(image instanceof File) || !image.type.startsWith('image/'),
    )
  ) {
    return NextResponse.json(
      { error: 'Choose one or more menu or product images to continue.' },
      { status: 400 },
    )
  }

  if (images.length > MAX_IMAGE_COUNT) {
    return NextResponse.json(
      { error: `Use up to ${MAX_IMAGE_COUNT} images at a time.` },
      { status: 400 },
    )
  }

  const imageFiles = images as File[]
  const totalImageBytes = imageFiles.reduce(
    (total, image) => total + image.size,
    0,
  )

  if (
    imageFiles.some(
      (image) => image.size === 0 || image.size > MAX_IMAGE_BYTES,
    ) ||
    totalImageBytes > MAX_TOTAL_IMAGE_BYTES
  ) {
    return NextResponse.json(
      { error: 'Keep the combined photo upload under 4 MB.' },
      { status: 400 },
    )
  }

  const model = process.env.EXTRACT_MODEL || DEFAULT_MODEL
  const fallbackModel =
    process.env.EXTRACT_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL

  try {
    const imageParts = await Promise.all(
      imageFiles.map(async (image) => ({
        type: 'image' as const,
        image: new Uint8Array(await image.arrayBuffer()),
        mediaType: image.type,
      })),
    )

    const { output } = await generateText({
      model,
      output: Output.object({
        schema: extractedMenuSchema,
        name: 'menu_products',
        description:
          'Unique products, optional variants, SGD prices, and the zero-based index of the source image where each product is visible.',
      }),
      system:
        'You extract seller menus into structured commerce data. Treat every supplied image as part of one combined menu. Read only what is visible. Extract each unique purchasable listing once, remove obvious duplicates repeated across images, keep product names concise, preserve meaningful variants, return prices as SGD numbers without currency symbols, and use null when there is no variant. For sourceImageIndex, return the zero-based position of an image where that product is clearly visible; when it appears more than once, choose the clearest image. Do not invent products or prices.',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                imageFiles.length === 1
                  ? 'This image is a seller menu. Extract every unique purchasable product, its variant when present, and its listed price.'
                  : `These ${imageFiles.length} images are parts of one seller menu. Extract every unique purchasable product, its variant when present, and its listed price across all of them.`,
            },
            ...imageParts,
          ],
        },
      ],
      maxOutputTokens: 1600,
      providerOptions: {
        gateway: {
          ...(fallbackModel === model ? {} : { models: [fallbackModel] }),
          tags: ['feature:menu-extraction'],
        },
      },
      experimental_include: {
        requestBody: false,
        responseBody: false,
      },
    })

    return NextResponse.json({
      products: output.products.map((product) => ({
        ...product,
        name: product.name.trim(),
        variant: product.variant?.trim() || null,
      })),
    })
  } catch (error) {
    console.error('Menu extraction failed', error)
    return NextResponse.json(
      {
        error:
          'We could not read that image. Try a clearer photo or enter the items manually.',
      },
      { status: 502 },
    )
  }
}
