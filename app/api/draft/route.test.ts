import { beforeEach, describe, expect, it, vi } from 'vitest'

import { dropDraftFixture } from '@/lib/fixtures/drop-draft-fixture'

const mocks = vi.hoisted(() => ({
  createAgent: vi.fn(),
  generate: vi.fn(),
  buildMessages: vi.fn(() => [{ role: 'user', content: 'Create a draft.' }]),
}))

vi.mock('@/lib/agents/drop-draft-agent', () => ({
  createDropDraftAgent: mocks.createAgent,
  buildDropDraftMessages: mocks.buildMessages,
}))

import { POST } from './route'

function draftRequest(
  images: File[] = [new File(['image'], 'menu.jpg', { type: 'image/jpeg' })],
  nudge?: string,
) {
  const formData = new FormData()
  for (const image of images) formData.append('images', image)
  if (nudge) formData.append('nudge', nudge)
  return new Request('http://localhost/api/draft', {
    method: 'POST',
    body: formData,
  })
}

describe('POST /api/draft', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createAgent.mockReturnValue({ generate: mocks.generate })
    mocks.generate.mockResolvedValue({ output: dropDraftFixture })
    process.env.DRAFT_FALLBACK_MODEL = 'openai/gpt-5.6-terra'
  })

  it('returns a clamped draft and forwards a valid nudge', async () => {
    mocks.generate.mockResolvedValueOnce({
      output: {
        ...dropDraftFixture,
        theme: {
          ...dropDraftFixture.theme,
          accent: { l: 0.75, c: 0.05, h: 90 },
        },
        paletteCandidates: [
          { l: 0.75, c: 0.05, h: 90 },
          ...dropDraftFixture.paletteCandidates.slice(1),
        ],
      },
    })

    const response = await POST(draftRequest(undefined, 'bolder'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.theme.accent.l).toBeLessThan(0.75)
    expect(body.theme.accent.c).toBeLessThanOrEqual(0.25)
    expect(mocks.buildMessages).toHaveBeenCalledWith(
      expect.any(Array),
      'bolder',
    )
    expect(mocks.createAgent).toHaveBeenCalledTimes(1)
  })

  it('retries once with the configured fallback model', async () => {
    mocks.generate
      .mockRejectedValueOnce(new Error('primary failed'))
      .mockResolvedValueOnce({ output: dropDraftFixture })

    const response = await POST(draftRequest())

    expect(response.status).toBe(200)
    expect(mocks.createAgent).toHaveBeenNthCalledWith(
      2,
      expect.any(Array),
      { model: 'openai/gpt-5.6-terra' },
    )
  })

  it('returns a seller-readable 502 after both models fail', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.generate.mockRejectedValue(new Error('model unavailable'))

    const response = await POST(draftRequest())

    expect(response.status).toBe(502)
    await expect(response.json()).resolves.toEqual({
      error:
        'We could not read that image. Try a clearer photo or enter the items manually.',
    })
    expect(mocks.generate).toHaveBeenCalledTimes(2)
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
    expect(mocks.createAgent).not.toHaveBeenCalled()
  })
})
