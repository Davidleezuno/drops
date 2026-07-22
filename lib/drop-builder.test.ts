import { describe, expect, it } from 'vitest'

import { createDropSchema, dropDraftSchema } from './drop-builder'
import { dropDraftFixture } from './fixtures/drop-draft-fixture'

describe('drop builder contracts', () => {
  it('parses the shared draft fixture', () => {
    expect(dropDraftSchema.parse(dropDraftFixture)).toEqual(dropDraftFixture)
  })

  it('keeps legacy publish requests compatible by defaulting theme to null', () => {
    const input = createDropSchema.parse({
      sellerName: 'Sunday Bakes',
      dropSlug: 'weekend-box',
      products: [
        {
          name: 'Cookie box',
          variant: null,
          price: 24,
          stock: 12,
          imageUrl: null,
        },
      ],
      windowEndsAt: null,
      fulfilment: 'pickup',
      deliveryFee: 0,
      pickupNote: null,
    })

    expect(input.theme).toBeNull()
    expect(input.products[0].displayKind).toBe('shelved')
  })
})
