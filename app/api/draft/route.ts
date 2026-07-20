import { NextResponse } from 'next/server'

import { generateDropDraft } from '@/lib/agents/drop-draft-agent'
import { dropDraftSchema } from '@/lib/drop-builder'
import { readValidatedImages } from '@/lib/draft-images'
import { clampTheme } from '@/lib/theme'

export const maxDuration = 60
export const runtime = 'nodejs'

const DEFAULT_FALLBACK_MODEL = 'openai/gpt-5.6-terra'

function clampDraft(output: unknown) {
  const draft = dropDraftSchema.parse(output)
  return dropDraftSchema.parse({
    ...draft,
    theme: clampTheme(draft.theme),
  })
}

export async function POST(request: Request) {
  const images = await readValidatedImages(request)

  if (!Array.isArray(images)) {
    return NextResponse.json(
      { error: images.error },
      { status: images.status },
    )
  }

  try {
    const fallbackModel =
      process.env.DRAFT_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL
    const { draft, timing } = await generateDropDraft(images, {
      fallbackModel,
    })
    const fallbackParts = timing.fallbackParts.join(',') || 'none'

    return NextResponse.json(clampDraft(draft), {
      headers: {
        'Server-Timing': [
          `catalog;dur=${timing.catalogMs}`,
          `theme;dur=${timing.themeMs}`,
          `draft;dur=${timing.totalMs}`,
        ].join(', '),
        'X-Draft-Fallback': fallbackParts,
      },
    })
  } catch (error) {
    console.error('Drop draft generation failed', error)
    return NextResponse.json(
      {
        error:
          'We could not read that image. Try a clearer photo or enter the items manually.',
      },
      { status: 502 },
    )
  }
}
