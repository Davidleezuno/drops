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
})

export type ExtractedMenu = z.infer<typeof extractedMenuSchema>
export type CreateDropInput = z.infer<typeof createDropSchema>
