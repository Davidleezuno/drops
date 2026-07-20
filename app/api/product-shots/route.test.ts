import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
  generateText: vi.fn(),
}))

vi.mock('ai', () => ({
  generateText: mocks.generateText,
}))

vi.mock('@/lib/db', () => ({
  createServiceClient: mocks.createServiceClient,
}))

import { POST } from './route'

function productShotRequest(mode: 'preview' | 'upload') {
  const formData = new FormData()
  formData.set('mode', mode)
  formData.set(
    'image',
    new File(['source image'], 'source.jpg', { type: 'image/jpeg' }),
  )
  return new Request('http://localhost/api/product-shots', {
    method: 'POST',
    body: formData,
  })
}

describe('POST /api/product-shots', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.generateText.mockResolvedValue({
      files: [
        {
          mediaType: 'image/png',
          uint8Array: new Uint8Array([1, 2, 3]),
        },
      ],
    })
  })

  it('returns a speculative image without writing it to storage', async () => {
    const response = await POST(productShotRequest('preview'))

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/png')
    expect(response.headers.get('x-product-shot-source')).toBe('preview')
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3]),
    )
    expect(mocks.createServiceClient).not.toHaveBeenCalled()
    expect(mocks.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'google/gemini-3.1-flash-image',
        providerOptions: expect.objectContaining({
          google: expect.objectContaining({
            thinkingConfig: { thinkingLevel: 'minimal' },
          }),
        }),
      }),
    )
  })
})
