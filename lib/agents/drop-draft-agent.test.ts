import { MockLanguageModelV3 } from 'ai/test'
import { describe, expect, it } from 'vitest'

import { dropDraftSchema } from '@/lib/drop-builder'
import { dropDraftFixture } from '@/lib/fixtures/drop-draft-fixture'
import { clampAccent } from '@/lib/theme'
import {
  createDropDraftAgent,
  DROP_DRAFT_AGENT_INSTRUCTIONS,
} from './drop-draft-agent'
import { proposePalette } from './tools/propose-palette'

const usage = {
  inputTokens: {
    total: 10,
    noCache: 10,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 20, text: 20, reasoning: undefined },
}

type GenerateResult = Awaited<
  ReturnType<MockLanguageModelV3['doGenerate']>
>

function generated(
  content: GenerateResult['content'],
  finishReason: 'stop' | 'tool-calls' = 'stop',
): GenerateResult {
  return {
    content,
    finishReason: { unified: finishReason, raw: undefined },
    usage,
    warnings: [],
  }
}

describe('drop draft agent', () => {
  it('wires the instructions, tool loop, and structured output', async () => {
    const clampedCandidates = [
      clampAccent({ l: 0.95, c: 0.4, h: 25 }),
      clampAccent({ l: 0.61, c: 0.12, h: 145 }),
      clampAccent({ l: 0.58, c: 0.16, h: 250 }),
    ]
    const designModel = new MockLanguageModelV3({
      doGenerate: generated([
        {
          type: 'text',
          text: JSON.stringify({
            candidates: [
              { l: 0.95, c: 0.4, h: 25 },
              { l: 0.61, c: 0.12, h: 145 },
              { l: 0.58, c: 0.16, h: 250 },
            ],
          }),
        },
      ]),
    })
    let coordinatorCall = 0
    const coordinatorModel = new MockLanguageModelV3({
      doGenerate: async () => {
        coordinatorCall += 1
        if (coordinatorCall === 1) {
          return generated(
            [
              {
                type: 'tool-call',
                toolCallId: 'palette-1',
                toolName: 'proposePalette',
                input: JSON.stringify({ vibe: 'cosy late-night home bakery' }),
              },
            ],
            'tool-calls',
          )
        }

        return generated([
          {
            type: 'text',
            text: JSON.stringify({
              ...dropDraftFixture,
              theme: {
                ...dropDraftFixture.theme,
                accent: clampedCandidates[0],
              },
              paletteCandidates: clampedCandidates,
            }),
          },
        ])
      },
    })
    const agent = createDropDraftAgent([], {
      model: coordinatorModel,
      designModel,
    })

    expect(Object.keys(agent.tools)).toEqual(['proposePalette'])
    const result = await agent.generate({ prompt: 'Create a draft.' })

    expect(dropDraftSchema.parse(result.output)).toEqual(result.output)
    expect(coordinatorModel.doGenerateCalls).toHaveLength(2)
    expect(coordinatorModel.doGenerateCalls[0].prompt).toContainEqual({
      role: 'system',
      content: DROP_DRAFT_AGENT_INSTRUCTIONS,
    })
    expect(designModel.doGenerateCalls).toHaveLength(1)
  })

  it('clamps palette candidates returned by the design model', async () => {
    const model = new MockLanguageModelV3({
      doGenerate: generated([
        {
          type: 'text',
          text: JSON.stringify({
            candidates: [
              { l: 1.2, c: 0.9, h: -30 },
              { l: 0.7, c: 0.01, h: 160 },
              { l: -1, c: 0.13, h: 500 },
            ],
          }),
        },
      ]),
    })

    const { candidates } = await proposePalette('bold sneaker reseller', [], {
      model,
    })

    expect(candidates).toHaveLength(3)
    for (const accent of candidates) {
      expect(accent.l).toBeGreaterThanOrEqual(0.45)
      expect(accent.l).toBeLessThanOrEqual(0.75)
      expect(accent.c).toBeGreaterThanOrEqual(0.05)
      expect(accent.c).toBeLessThanOrEqual(0.25)
      expect(accent.h).toBeGreaterThanOrEqual(0)
      expect(accent.h).toBeLessThanOrEqual(360)
    }
  })
})
