import { beforeEach, describe, expect, it, vi } from 'vitest'

import { dropDraftFixture } from '@/lib/fixtures/drop-draft-fixture'

const mocks = vi.hoisted(() => ({
  generateDropDraft: vi.fn(),
}))

vi.mock('@/lib/agents/drop-draft-agent', () => ({
  generateDropDraft: mocks.generateDropDraft,
}))

import { POST } from './route'

function draftRequest(
  images: File[] = [new File(['image'], 'menu.jpg', { type: 'image/jpeg' })],
) {
  const formData = new FormData()
  for (const image of images) formData.append('images', image)
  return new Request('http://localhost/api/draft', {
    method: 'POST',
    body: formData,
  })
}

describe('POST /api/draft', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.generateDropDraft.mockResolvedValue({
      draft: dropDraftFixture,
      timing: {
        catalogMs: 120,
        themeMs: 150,
        totalMs: 155,
        fallbackParts: [],
      },
    })
    process.env.DRAFT_FALLBACK_MODEL = 'openai/gpt-5.6-terra'
  })

  it('returns a clamped draft with generation timing', async () => {
    mocks.generateDropDraft.mockResolvedValueOnce({
      draft: {
        ...dropDraftFixture,
        theme: {
          ...dropDraftFixture.theme,
          accent: { l: 0.75, c: 0.05, h: 90 },
        },
      },
      timing: {
        catalogMs: 120,
        themeMs: 150,
        totalMs: 155,
        fallbackParts: ['theme'],
      },
    })

    const response = await POST(draftRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.theme.accent.l).toBeLessThan(0.75)
    expect(response.headers.get('server-timing')).toBe(
      'catalog;dur=120, theme;dur=150, draft;dur=155',
    )
    expect(response.headers.get('x-draft-fallback')).toBe('theme')
    expect(mocks.generateDropDraft).toHaveBeenCalledWith(expect.any(Array), {
      fallbackModel: 'openai/gpt-5.6-terra',
    })
  })

  it('returns a seller-readable 502 after generation fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.generateDropDraft.mockRejectedValue(new Error('models unavailable'))

    const response = await POST(draftRequest())

    expect(response.status).toBe(502)
    await expect(response.json()).resolves.toEqual({
      error:
        'We could not read that image. Try a clearer photo or enter the items manually.',
    })
    consoleError.mockRestore()
  })

  it.each([
    {
      name: 'no image',
      images: [],
      error: 'Choose one or more menu or product images to continue.',
    },
    {
      name: 'wrong MIME',
      images: [new File(['text'], 'menu.txt', { type: 'text/plain' })],
      error: 'Choose one or more menu or product images to continue.',
    },
    {
      name: 'six images',
      images: Array.from(
        { length: 6 },
        (_, index) =>
          new File(['image'], `menu-${index}.jpg`, { type: 'image/jpeg' }),
      ),
      error: 'Use up to 5 images at a time.',
    },
    {
      name: 'oversized image',
      images: [
        new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'large.jpg', {
          type: 'image/jpeg',
        }),
      ],
      error: 'Keep the combined photo upload under 4 MB.',
    },
  ])('preserves the validation contract for $name', async ({ images, error }) => {
    const response = await POST(draftRequest(images))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error })
    expect(mocks.generateDropDraft).not.toHaveBeenCalled()
  })
})
