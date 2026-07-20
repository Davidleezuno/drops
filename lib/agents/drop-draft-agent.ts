import {
  Output,
  ToolLoopAgent,
  stepCountIs,
  tool,
  type LanguageModel,
  type ModelMessage,
} from 'ai'
import { z } from 'zod'

import { dropDraftSchema } from '@/lib/drop-builder'
import { proposePalette } from '@/lib/agents/tools/propose-palette'
import type { DraftImage } from '@/lib/agents/types'

const DEFAULT_DRAFT_MODEL = 'anthropic/claude-sonnet-5'

export const DROP_DRAFT_AGENT_INSTRUCTIONS = `You are the drop builder for Drops, a storefront for people with a
following. From the seller's uploaded images (menu cards, product photos, live-sale
prep sheets) you produce ONE structured draft: the products for sale and a storefront
design that fits the seller.

Rules:
- Make one product per distinct item/photo. Never invent a price or stock count; return null
  when it is not visibly stated so the seller can fill only that missing fact.
- Separate inventory choices from shared-stock customizations. A size, format, portion, or
  other choice is an inventoryChoice only when the image provides evidence that it is sold
  as a distinct option. Chilli/no chilli, gift notes, and preparation preferences are
  customizations because they all consume the same product stock.
- Group visible variants under one product. Do not generate a size range or option values
  merely because they are common for that category. The editor provides quick presets.
- Classify the vertical from what you see; choose the archetype that best sells it:
  fnb → menu, photo-forward products → grid, one hero item → spotlight, group-buy → tiers.
  This is a default the seller can change — pick the strongest fit, not a safe middle.
- Call proposePalette to get candidate accents designed for this seller's vibe, then
  choose the primary accent from those candidates. Return ALL candidates in
  paletteCandidates so the seller can pick a different one.
- Write dropTitle/sellerNote/ogCard in the seller's own register — mirror the language
  and tone of any text visible in the images (including Singlish). Short. No emoji spam.
- If prices, stock counts, a selling window, or delivery details are not visible in the images,
  list them in needsInput. Do not guess them.
- You produce a draft only. You never publish.`

type CreateDropDraftAgentOptions = {
  model?: LanguageModel
  designModel?: LanguageModel
}

export function createDropDraftAgent(
  images: DraftImage[],
  options: CreateDropDraftAgentOptions = {},
) {
  const model = options.model ?? process.env.DRAFT_MODEL ?? DEFAULT_DRAFT_MODEL

  return new ToolLoopAgent({
    model,
    instructions: DROP_DRAFT_AGENT_INSTRUCTIONS,
    tools: {
      proposePalette: tool({
        description:
          "Propose 3-5 candidate accent colors (OKLCH) designed for this seller's vibe — what they sell, who they sell to, and the mood of their imagery. Each candidate is returned pre-clamped for legibility on the storefront background.",
        inputSchema: z.object({
          vibe: z.string().max(200),
        }),
        execute: async ({ vibe }) =>
          proposePalette(vibe, images, { model: options.designModel }),
      }),
    },
    stopWhen: stepCountIs(8),
    output: Output.object({ schema: dropDraftSchema, name: 'drop_draft' }),
  })
}

export function buildDropDraftMessages(
  images: DraftImage[],
  nudge?: 'bolder' | 'calmer',
): ModelMessage[] {
  const nudgeSentence = nudge
    ? ` The seller wants a ${nudge} look — re-propose the design.`
    : ''

  return [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Create the drop draft from these images.${nudgeSentence}`,
        },
        ...images.map((image) => ({
          type: 'image' as const,
          image: image.bytes,
          mediaType: image.mediaType,
        })),
      ],
    },
  ]
}
