import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { dropDraftFixture } from '@/lib/fixtures/drop-draft-fixture'
import { clampTheme } from '@/lib/theme'

const mocks = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
  toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,qr'),
}))

vi.mock('@/lib/db', () => ({
  createServiceClient: mocks.createServiceClient,
}))

vi.mock('qrcode', () => ({
  default: { toDataURL: mocks.toDataURL },
}))

import { POST } from './route'

const basePayload = {
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
  pickupNote: 'Collect after 6pm',
}

let insertedDrop: Record<string, unknown> | undefined

function serviceClient() {
  return {
    from(table: string) {
      if (table === 'drops') {
        return {
          insert(value: Record<string, unknown>) {
            insertedDrop = value
            return {
              select() {
                return {
                  async single() {
                    return {
                      data: {
                        id: 'drop-1',
                        seller_slug: 'sunday-bakes',
                        drop_slug: 'weekend-box',
                        manage_token: 'manage-token',
                      },
                      error: null,
                    }
                  },
                }
              },
            }
          },
        }
      }

      return {
        async insert() {
          return { error: null }
        },
      }
    },
  }
}

function publishRequest(payload: unknown) {
  return new NextRequest('http://localhost/api/drops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

describe('POST /api/drops theme persistence', () => {
  beforeEach(() => {
    insertedDrop = undefined
    mocks.createServiceClient.mockReturnValue(serviceClient())
  })

  it('persists a valid theme without changing the response contract', async () => {
    const response = await POST(
      publishRequest({ ...basePayload, theme: dropDraftFixture.theme }),
    )

    expect(response.status).toBe(201)
    expect(insertedDrop?.theme).toEqual(clampTheme(dropDraftFixture.theme))
    expect(await response.json()).toMatchObject({
      buyerUrl: 'http://localhost/sunday-bakes/weekend-box',
      manageUrl: 'http://localhost/manage/manage-token',
      sellerSlug: 'sunday-bakes',
      dropSlug: 'weekend-box',
    })
  })

  it('clamps an out-of-band accent before persisting', async () => {
    const submittedTheme = {
      ...dropDraftFixture.theme,
      accent: { l: 0.95, c: 0.4, h: 48 },
    }

    const response = await POST(
      publishRequest({ ...basePayload, theme: submittedTheme }),
    )

    expect(response.status).toBe(201)
    expect(insertedDrop?.theme).toEqual(
      clampTheme(submittedTheme as typeof dropDraftFixture.theme),
    )
  })

  it('persists null when the legacy publish request omits theme', async () => {
    const response = await POST(publishRequest(basePayload))

    expect(response.status).toBe(201)
    expect(insertedDrop?.theme).toBeNull()
  })
})
