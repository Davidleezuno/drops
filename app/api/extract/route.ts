import { generateText, Output } from 'ai'
import { NextResponse } from 'next/server'

import { extractedMenuSchema } from '@/lib/drop-builder'

export const maxDuration = 30
export const runtime = 'nodejs'

const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const DEFAULT_MODEL = 'openai/gpt-5.6-terra'
const DEFAULT_FALLBACK_MODEL = 'anthropic/claude-sonnet-4.6'

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null)
  const image = formData?.get('image')

  if (!(image instanceof File) || !image.type.startsWith('image/')) {
    return NextResponse.json(
      { error: 'Choose a menu or product image to continue.' },
      { status: 400 },
    )
  }

  if (image.size === 0 || image.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: 'Use an image smaller than 4 MB.' },
      { status: 400 },
    )
  }

  const model = process.env.EXTRACT_MODEL || DEFAULT_MODEL
  const fallbackModel =
    process.env.EXTRACT_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL

  try {
    const { output } = await generateText({
      model,
      output: Output.object({
        schema: extractedMenuSchema,
        name: 'menu_products',
        description:
          'Products, optional variants, and SGD prices visible in a seller menu image.',
      }),
      system:
        'You extract a seller menu into structured commerce data. Read only what is visible. Keep product names concise, preserve meaningful variants, return prices as SGD numbers without currency symbols, and use null when there is no variant. Do not invent products or prices.',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract every purchasable product, its variant when present, and its listed price from this image.',
            },
            {
              type: 'image',
              image: new Uint8Array(await image.arrayBuffer()),
              mediaType: image.type,
            },
          ],
        },
      ],
      maxOutputTokens: 800,
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
