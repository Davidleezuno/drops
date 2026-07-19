import { NextResponse } from 'next/server'

import {
  buildDropDraftMessages,
  createDropDraftAgent,
} from '@/lib/agents/drop-draft-agent'
import type { DraftImage } from '@/lib/agents/types'
import { dropDraftSchema } from '@/lib/drop-builder'
import { readValidatedImages } from '@/lib/draft-images'
import { clampAccent, clampTheme } from '@/lib/theme'

export const maxDuration = 60
export const runtime = 'nodejs'

const DEFAULT_FALLBACK_MODEL = 'openai/gpt-5.6-terra'

// Optional `nudge=bolder|calmer` is additive to the multipart image contract.
function readNudge(formData: FormData | null) {
  const value = formData?.get('nudge')
  return value === 'bolder' || value === 'calmer' ? value : undefined
}

function clampDraft(output: unknown) {
  const draft = dropDraftSchema.parse(output)
  return dropDraftSchema.parse({
    ...draft,
    theme: clampTheme(draft.theme),
    paletteCandidates: draft.paletteCandidates.map(clampAccent),
  })
}

async function generateDraft(
  images: DraftImage[],
  nudge: 'bolder' | 'calmer' | undefined,
  model?: string,
) {
  const agent = createDropDraftAgent(images, model ? { model } : undefined)
  const { output } = await agent.generate({
    messages: buildDropDraftMessages(images, nudge),
  })
  return clampDraft(output)
}

export async function POST(request: Request) {
  const nudgePromise = request
    .clone()
    .formData()
    .then(readNudge)
    .catch(() => undefined)
  const images = await readValidatedImages(request)

  if (!Array.isArray(images)) {
    return NextResponse.json(
      { error: images.error },
      { status: images.status },
    )
  }

  const nudge = await nudgePromise

  try {
    return NextResponse.json(await generateDraft(images, nudge))
  } catch (primaryError) {
    const fallbackModel =
      process.env.DRAFT_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL

    try {
      return NextResponse.json(
        await generateDraft(images, nudge, fallbackModel),
      )
    } catch (fallbackError) {
      console.error('Drop draft generation failed', {
        primaryError,
        fallbackError,
      })
      return NextResponse.json(
        {
          error:
            'We could not read that image. Try a clearer photo or enter the items manually.',
        },
        { status: 502 },
      )
    }
  }
}
