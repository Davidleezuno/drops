import { generateText, Output, type LanguageModel, type ModelMessage } from 'ai'
import { z } from 'zod'

import {
  dropDraftSchema,
  productDisplayKindSchema,
  storefrontThemeSchema,
  type DropDraft,
} from '@/lib/drop-builder'
import type { DraftImage } from '@/lib/agents/types'
import { clampTheme } from '@/lib/theme'

const DEFAULT_CATALOG_MODEL = 'google/gemini-3.5-flash-lite'
const DEFAULT_THEME_MODEL = 'google/gemini-3.5-flash'
const DEFAULT_FALLBACK_MODEL = 'openai/gpt-5.6-terra'
const GENERATION_TIMEOUT_MS = 20_000

const catalogDraftSchema = z.object({
  products: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        variant: z.string().max(120).nullable(),
        price: z.number().positive().max(100_000).nullable(),
        stock: z.number().int().nonnegative().max(100_000).nullable(),
        sourceImageIndex: z.number().int().min(0).max(4),
        displayKind: productDisplayKindSchema,
      }),
    )
    .min(1)
    .max(30),
  needsInput: dropDraftSchema.shape.needsInput,
})

// Let deterministic code trim generated marketing copy. Rejecting a complete
// vision response because it is a few characters long would waste a fallback.
const generatedThemeSchema = storefrontThemeSchema.extend({
  voice: storefrontThemeSchema.shape.voice.extend({
    dropTitle: z.string().max(500),
    sellerNote: z.string().max(1_000).nullable(),
  }),
  ogCard: storefrontThemeSchema.shape.ogCard.extend({
    headline: z.string().max(500),
    badge: z.string().max(500).nullable(),
  }),
})

const themeDraftSchema = z.object({
  theme: generatedThemeSchema,
})

export const CATALOG_INSTRUCTIONS = `Read the seller's uploaded images and create accurate, editable commerce listings.

Rules:
- Make one product per distinct item/photo. Never invent a price or stock count; return null when it is not visibly stated.
- Group visible variants under one product when possible. Do not generate common options that are not shown.
- sourceImageIndex is the zero-based index of the clearest uploaded image showing the product.
- Choose one displayKind from what the product physically is: served for food/drink, hung for garments or bags that drape, framed for prints and flat art, stacked for folded textiles/books/boxed sets, tabletop for small handled goods, and shelved for jars/bottles/collectibles or the safest general fallback.
- List every missing seller decision in needsInput. Do not guess.`

export const THEME_INSTRUCTIONS = `Design one restrained storefront theme from the seller's uploaded images.

Rules:
- Classify the vertical and choose the archetype that best sells it: fnb → menu, photo-forward products → grid, one hero item → spotlight. Do not choose tiers.
- Pick one distinctive OKLCH accent that suits the seller and remains within the schema's legibility bounds.
- Write dropTitle, sellerNote, and ogCard in the seller's register. Mirror visible language, including Singlish. Keep it short and avoid emoji spam.
- Use an upload crop only when an image has a strong hero composition; otherwise use no hero.
- Produce a proposal only. Never publish.`

type GenerateDropDraftOptions = {
  model?: LanguageModel
  fallbackModel?: LanguageModel
  timeoutMs?: number
}

export type DraftGenerationTiming = {
  catalogMs: number
  themeMs: number
  totalMs: number
  fallbackParts: Array<'catalog' | 'theme'>
}

function buildMessages(images: DraftImage[], prompt: string): ModelMessage[] {
  return [
    {
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        ...images.map((image) => ({
          type: 'image' as const,
          image: image.bytes,
          mediaType: image.mediaType,
        })),
      ],
    },
  ]
}

function latencyProviderOptions(model: LanguageModel) {
  return typeof model === 'string' && model.startsWith('google/')
    ? {
        google: {
          thinkingConfig: {
            thinkingLevel: 'low' as const,
          },
        },
      }
    : undefined
}

async function withFallback<T>({
  part,
  model,
  fallbackModel,
  timeoutMs,
  generate,
}: {
  part: 'catalog' | 'theme'
  model: LanguageModel
  fallbackModel?: LanguageModel
  timeoutMs: number
  generate: (model: LanguageModel, abortSignal: AbortSignal) => Promise<T>
}) {
  const startedAt = performance.now()

  try {
    return {
      output: await generate(model, AbortSignal.timeout(timeoutMs)),
      durationMs: Math.round(performance.now() - startedAt),
      usedFallback: false,
    }
  } catch (primaryError) {
    if (!fallbackModel || fallbackModel === model) throw primaryError

    try {
      return {
        output: await generate(
          fallbackModel,
          AbortSignal.timeout(timeoutMs),
        ),
        durationMs: Math.round(performance.now() - startedAt),
        usedFallback: true,
      }
    } catch (fallbackError) {
      throw new AggregateError(
        [primaryError, fallbackError],
        `${part} generation failed with both models`,
      )
    }
  }
}

export async function generateDropDraft(
  images: DraftImage[],
  options: GenerateDropDraftOptions = {},
): Promise<{ draft: DropDraft; timing: DraftGenerationTiming }> {
  const modelOverride = options.model ?? process.env.DRAFT_MODEL
  const catalogModel = modelOverride ?? DEFAULT_CATALOG_MODEL
  const themeModel = modelOverride ?? DEFAULT_THEME_MODEL
  const fallbackModel =
    options.fallbackModel ??
    process.env.DRAFT_FALLBACK_MODEL ??
    DEFAULT_FALLBACK_MODEL
  const timeoutMs = options.timeoutMs ?? GENERATION_TIMEOUT_MS
  const startedAt = performance.now()

  const [catalog, storefront] = await Promise.all([
    withFallback({
      part: 'catalog',
      model: catalogModel,
      fallbackModel,
      timeoutMs,
      generate: async (selectedModel, abortSignal) => {
        const { output } = await generateText({
          model: selectedModel,
          system: CATALOG_INSTRUCTIONS,
          messages: buildMessages(
            images,
            `Create listings from all ${images.length} uploaded ${images.length === 1 ? 'image' : 'images'}.`,
          ),
          output: Output.object({
            schema: catalogDraftSchema,
            name: 'drop_catalog',
          }),
          abortSignal,
          maxRetries: 0,
          providerOptions: latencyProviderOptions(selectedModel),
        })
        return output
      },
    }),
    withFallback({
      part: 'theme',
      model: themeModel,
      fallbackModel,
      timeoutMs,
      generate: async (selectedModel, abortSignal) => {
        const { output } = await generateText({
          model: selectedModel,
          system: THEME_INSTRUCTIONS,
          messages: buildMessages(images, 'Propose one storefront theme.'),
          output: Output.object({
            schema: themeDraftSchema,
            name: 'storefront_theme',
          }),
          abortSignal,
          maxRetries: 0,
          providerOptions: latencyProviderOptions(selectedModel),
        })
        return output
      },
    }),
  ])

  return {
    draft: dropDraftSchema.parse({
      products: catalog.output.products.map((product) => ({
        ...product,
        inventoryChoice: null,
        customizations: [],
      })),
      needsInput: catalog.output.needsInput,
      theme: clampTheme(storefront.output.theme),
    }),
    timing: {
      catalogMs: catalog.durationMs,
      themeMs: storefront.durationMs,
      totalMs: Math.round(performance.now() - startedAt),
      fallbackParts: [
        ...(catalog.usedFallback ? (['catalog'] as const) : []),
        ...(storefront.usedFallback ? (['theme'] as const) : []),
      ],
    },
  }
}
