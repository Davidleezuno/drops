import { MockLanguageModelV3 } from 'ai/test'
import { describe, expect, it } from 'vitest'

import { dropDraftSchema } from '@/lib/drop-builder'
import { dropDraftFixture } from '@/lib/fixtures/drop-draft-fixture'
import {
  CATALOG_INSTRUCTIONS,
  generateDropDraft,
  THEME_INSTRUCTIONS,
} from './drop-draft-agent'

const usage = {
  inputTokens: {
    total: 10,
    noCache: 10,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 20, text: 20, reasoning: undefined },
}

type GenerateResult = Awaited<ReturnType<MockLanguageModelV3['doGenerate']>>

function generated(value: unknown): GenerateResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(value) }],
    finishReason: { unified: 'stop', raw: undefined },
    usage,
    warnings: [],
  }
}

describe('direct drop draft generation', () => {
  it('runs catalog and theme structured-output calls in parallel', async () => {
    let call = 0
    const model = new MockLanguageModelV3({
      doGenerate: async () => {
        call += 1
        return call === 1
          ? generated({
              products: dropDraftFixture.products,
              needsInput: dropDraftFixture.needsInput,
            })
          : generated({ theme: dropDraftFixture.theme })
      },
    })

    const { draft, timing } = await generateDropDraft([], {
      model,
      timeoutMs: 1_000,
    })

    expect(dropDraftSchema.parse(draft)).toEqual(dropDraftFixture)
    expect(model.doGenerateCalls).toHaveLength(2)
    expect(model.doGenerateCalls.map((request) => request.prompt[0])).toEqual(
      expect.arrayContaining([
        { role: 'system', content: CATALOG_INSTRUCTIONS },
        { role: 'system', content: THEME_INSTRUCTIONS },
      ]),
    )
    expect(timing.fallbackParts).toEqual([])
  })

  it('retries only the failed part with the fallback model', async () => {
    let call = 0
    const primaryModel = new MockLanguageModelV3({
      doGenerate: async () => {
        call += 1
        if (call === 2) throw new Error('theme failed')
        return generated({
          products: dropDraftFixture.products,
          needsInput: dropDraftFixture.needsInput,
        })
      },
    })
    const fallbackModel = new MockLanguageModelV3({
      doGenerate: generated({ theme: dropDraftFixture.theme }),
    })

    const { draft, timing } = await generateDropDraft([], {
      model: primaryModel,
      fallbackModel,
      timeoutMs: 1_000,
    })

    expect(draft).toEqual(dropDraftFixture)
    expect(primaryModel.doGenerateCalls).toHaveLength(2)
    expect(fallbackModel.doGenerateCalls).toHaveLength(1)
    expect(timing.fallbackParts).toEqual(['theme'])
  })
})
