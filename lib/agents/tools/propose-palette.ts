import { generateText, Output, type LanguageModel } from 'ai'
import { z } from 'zod'

import type { StorefrontTheme } from '@/lib/drop-builder'
import type { DraftImage } from '@/lib/agents/types'
import { clampAccent } from '@/lib/theme'

const DEFAULT_DESIGN_MODEL = 'google/gemini-3.5-flash'

const paletteOutputSchema = z.object({
  candidates: z
    .array(
      z.object({
        l: z.number(),
        c: z.number(),
        h: z.number(),
      }),
    )
    .min(3)
    .max(5),
})

type ProposePaletteOptions = {
  model?: LanguageModel
}

export async function proposePalette(
  vibe: string,
  images: DraftImage[],
  options: ProposePaletteOptions = {},
): Promise<{ candidates: StorefrontTheme['accent'][] }> {
  const model = options.model ?? process.env.DESIGN_MODEL ?? DEFAULT_DESIGN_MODEL
  const { output } = await generateText({
    model,
    output: Output.object({
      schema: paletteOutputSchema,
      name: 'storefront_palette',
    }),
    system: `You are a storefront art director for independent sellers. Design 3–5 clearly differentiated OKLCH accent candidates for the seller vibe. The supplied images are reference for what the store sells, not pixels to sample: design for the vibe rather than extracting dominant photo colors. The accents will sit beside these photos, so they must still feel harmonious. Avoid generic AI convergence such as returning several near-identical teal or coral options. Vary hue meaningfully across the set. Return numeric l, c, and h values only; deterministic code will enforce final legibility.`,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Seller vibe: ${vibe}`,
          },
          ...images.map((image) => ({
            type: 'image' as const,
            image: image.bytes,
            mediaType: image.mediaType,
          })),
        ],
      },
    ],
  })

  return { candidates: output.candidates.map(clampAccent) }
}
