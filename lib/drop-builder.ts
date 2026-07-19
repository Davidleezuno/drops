import { z } from 'zod'

export { slugify } from '@/lib/format'

export const extractedMenuSchema = z.object({
  products: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        variant: z.string().max(120).nullable(),
        price: z.number().positive().max(100_000),
        sourceImageIndex: z.number().int().min(0).max(4),
      }),
    )
    .min(1)
    .max(30),
})

export const storefrontThemeSchema = z.object({
  accent: z.object({
    l: z.number().min(0.45).max(0.75),
    c: z.number().min(0.05).max(0.25),
    h: z.number().min(0).max(360),
  }),
  archetype: z.enum(['menu', 'grid', 'spotlight', 'tiers']),
  vertical: z.enum([
    'fnb',
    'fashion',
    'beauty',
    'collectibles',
    'services',
    'other',
  ]),
  hero: z.object({
    source: z.enum(['upload-crop', 'none']),
    sourceImageIndex: z.number().int().min(0).max(4).nullable(),
    crop: z
      .object({
        x: z.number(),
        y: z.number(),
        w: z.number(),
        h: z.number(),
      })
      .nullable(),
  }),
  voice: z.object({
    dropTitle: z.string().trim().min(1).max(60),
    sellerNote: z.string().trim().max(140).nullable(),
    tone: z.enum(['warm', 'hype', 'minimal']),
  }),
  ogCard: z.object({
    headline: z.string().trim().min(1).max(48),
    badge: z.string().trim().max(24).nullable(),
  }),
})

export const dropDraftSchema = z.object({
  products: extractedMenuSchema.shape.products,
  theme: storefrontThemeSchema,
  paletteCandidates: z
    .array(storefrontThemeSchema.shape.accent)
    .min(3)
    .max(5),
  needsInput: z.array(
    z.enum(['stock', 'window', 'deliveryFee', 'pickup']),
  ),
})

export const createDropSchema = z.object({
  sellerName: z.string().trim().min(1).max(80),
  dropSlug: z.string().trim().min(1).max(64),
  products: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        variant: z.string().trim().max(120).nullable(),
        price: z.number().positive().max(100_000),
        // null = no cap (future-ideas §3): sell until the seller ends it.
        stock: z.number().int().positive().max(100_000).nullable(),
        imageUrl: z.url().max(2_000).nullable(),
      }),
    )
    .min(1)
    .max(30),
  // null = keep it open: a permanent storefront with no countdown.
  windowEndsAt: z.iso.datetime().nullable(),
  fulfilment: z.enum(['pickup', 'delivery', 'both']),
  deliveryFee: z.number().min(0).max(100_000),
  pickupNote: z.string().trim().max(240).nullable(),
  // Default preserves publish requests from the pre-theme builder.
  theme: storefrontThemeSchema.nullable().default(null),
})

export type ExtractedMenu = z.infer<typeof extractedMenuSchema>
export type StorefrontTheme = z.infer<typeof storefrontThemeSchema>
export type DropDraft = z.infer<typeof dropDraftSchema>
export type CreateDropInput = z.infer<typeof createDropSchema>
