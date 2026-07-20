import { generateText, Output } from 'ai'
import { NextResponse } from 'next/server'

import { extractedMenuSchema } from '@/lib/drop-builder'
import { readValidatedImages } from '@/lib/draft-images'

export const maxDuration = 30
export const runtime = 'nodejs'

const DEFAULT_MODEL = 'openai/gpt-5.6-terra'
const DEFAULT_FALLBACK_MODEL = 'anthropic/claude-sonnet-4.6'

export async function POST(request: Request) {
  const images = await readValidatedImages(request)
  if (!Array.isArray(images)) {
    return NextResponse.json(
      { error: images.error },
      { status: images.status },
    )
  }

  const model = process.env.EXTRACT_MODEL || DEFAULT_MODEL
  const fallbackModel =
    process.env.EXTRACT_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL

  try {
    const imageParts = images.map((image) => ({
      type: 'image' as const,
      image: image.bytes,
      mediaType: image.mediaType,
    }))

    const { output } = await generateText({
      model,
      output: Output.object({
        schema: extractedMenuSchema,
        name: 'menu_products',
        description:
          'Unique products, visible inventory choices, shared-stock customizations, commerce facts when shown, and the source image index.',
      }),
      system:
        'You turn seller photos and menus into editable commerce drafts. Treat every supplied image as part of one set. Create one product per distinct item, remove obvious duplicates, and keep names concise. Return null for prices and stock that are not visibly stated. Group visibly stated separately stocked choices such as sizes under inventoryChoice. Put preparation preferences such as chilli/no chilli under customizations because they share product stock. Never invent option values, products, prices, or stock. For sourceImageIndex choose the clearest image where the product appears.',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                images.length === 1
                  ? 'Create the most useful editable listing draft from this seller image.'
                  : `Create the most useful editable listing draft from these ${images.length} seller images.`,
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
