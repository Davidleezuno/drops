/**
 * Live, non-CI agent eval.
 *
 * Run: `pnpm tsx scripts/eval-draft-agent.ts`
 * Cost/duration: three live cases, normally 2–3 Gateway generations each;
 * expect several minutes and standard usage charges for DRAFT_MODEL/DESIGN_MODEL.
 * Add a case by placing its images in docs/test-images/ and appending exact visible
 * ground truth plus provenance to scripts/eval-cases.ts.
 */
import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'

import {
  buildDropDraftMessages,
  createDropDraftAgent,
} from '@/lib/agents/drop-draft-agent'
import type { DraftImage } from '@/lib/agents/types'
import {
  dropDraftSchema,
  type DropDraft,
  type StorefrontTheme,
} from '@/lib/drop-builder'
import { draftEvalCases, type DraftEvalCase } from './eval-cases'

const mediaTypes: Record<string, string> = {
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

type EvalResult = {
  case: string
  schema: 'PASS' | 'FAIL'
  products: 'PASS' | 'FAIL'
  vertical: 'PASS' | 'FAIL'
  palette: 'PASS' | 'FAIL'
  needsInput: 'PASS' | 'FAIL'
  seconds: string
  draft?: DropDraft
  notes: string[]
  schemaInvalid?: boolean
}

function sameAccent(
  first: StorefrontTheme['accent'],
  second: StorefrontTheme['accent'],
) {
  return first.l === second.l && first.c === second.c && first.h === second.h
}

function normalizedProduct(product: { name: string; price: number | null }) {
  return `${product.name.trim().toLocaleLowerCase('en')}|${product.price}`
}

function productsMatch(
  actual: DropDraft['products'],
  expected: DraftEvalCase['products'],
) {
  const actualSet = new Set(actual.map(normalizedProduct))
  const expectedSet = new Set(expected.map(normalizedProduct))
  return (
    actualSet.size === expectedSet.size &&
    [...expectedSet].every((product) => actualSet.has(product))
  )
}

async function loadImages(paths: string[]): Promise<DraftImage[]> {
  return Promise.all(
    paths.map(async (path) => {
      const mediaType = mediaTypes[extname(path).toLowerCase()]
      if (!mediaType) throw new Error(`Unsupported image extension: ${path}`)
      return { bytes: new Uint8Array(await readFile(path)), mediaType }
    }),
  )
}

async function runCase(evalCase: DraftEvalCase): Promise<EvalResult> {
  const startedAt = performance.now()
  const notes: string[] = []

  try {
    const images = await loadImages(evalCase.images)
    const agent = createDropDraftAgent(images)
    const { output } = await agent.generate({
      messages: buildDropDraftMessages(images),
    })

    let draft: DropDraft
    try {
      draft = dropDraftSchema.parse(output)
    } catch (error) {
      notes.push(error instanceof Error ? error.message : String(error))
      return {
        case: evalCase.name,
        schema: 'FAIL',
        products: 'FAIL',
        vertical: 'FAIL',
        palette: 'FAIL',
        needsInput: 'FAIL',
        seconds: ((performance.now() - startedAt) / 1_000).toFixed(1),
        notes,
        schemaInvalid: true,
      }
    }

    const productPass = productsMatch(draft.products, evalCase.products)
    const verticalPass = draft.theme.vertical === evalCase.vertical
    const palettePass = draft.paletteCandidates.some((candidate) =>
      sameAccent(candidate, draft.theme.accent),
    )
    const needsInputPass = evalCase.expectedNeedsInput.every((field) =>
      draft.needsInput.includes(field),
    )

    if (!productPass) {
      notes.push(
        `products: expected ${JSON.stringify(evalCase.products)}, received ${JSON.stringify(
          draft.products.map(({ name, price }) => ({ name, price })),
        )}`,
      )
    }
    if (!verticalPass) {
      notes.push(
        `vertical: expected ${evalCase.vertical}, received ${draft.theme.vertical}`,
      )
    }
    if (!palettePass) notes.push('theme.accent is not in paletteCandidates')
    if (!needsInputPass) {
      notes.push(
        `needsInput: expected at least ${evalCase.expectedNeedsInput.join(', ')}, received ${draft.needsInput.join(', ')}`,
      )
    }

    return {
      case: evalCase.name,
      schema: 'PASS',
      products: productPass ? 'PASS' : 'FAIL',
      vertical: verticalPass ? 'PASS' : 'FAIL',
      palette: palettePass ? 'PASS' : 'FAIL',
      needsInput: needsInputPass ? 'PASS' : 'FAIL',
      seconds: ((performance.now() - startedAt) / 1_000).toFixed(1),
      draft,
      notes,
    }
  } catch (error) {
    notes.push(`generation error: ${error instanceof Error ? error.message : error}`)
    return {
      case: evalCase.name,
      schema: 'FAIL',
      products: 'FAIL',
      vertical: 'FAIL',
      palette: 'FAIL',
      needsInput: 'FAIL',
      seconds: ((performance.now() - startedAt) / 1_000).toFixed(1),
      notes,
    }
  }
}

function printConvergenceWarnings(results: EvalResult[]) {
  const successful = results.filter(
    (result): result is EvalResult & { draft: DropDraft } => Boolean(result.draft),
  )

  for (let first = 0; first < successful.length; first += 1) {
    for (let second = first + 1; second < successful.length; second += 1) {
      const firstAccent = successful[first].draft.theme.accent
      const secondAccent = successful[second].draft.theme.accent
      const rawHueDistance = Math.abs(firstAccent.h - secondAccent.h)
      const hueDistance = Math.min(rawHueDistance, 360 - rawHueDistance)
      const lightnessDistance = Math.abs(firstAccent.l - secondAccent.l)

      if (hueDistance < 20 && lightnessDistance < 0.05) {
        console.warn(
          `CONVERGENCE WARNING: ${successful[first].case} and ${successful[second].case} chose accents only Δh=${hueDistance.toFixed(1)}°, ΔL=${lightnessDistance.toFixed(3)} apart.`,
        )
      }
    }
  }
}

async function main() {
  const results: EvalResult[] = []
  for (const evalCase of draftEvalCases) {
    console.log(`\nRunning ${evalCase.name}…`)
    results.push(await runCase(evalCase))
  }

  console.table(
    results.map((result) => ({
      case: result.case,
      schema: result.schema,
      products: result.products,
      vertical: result.vertical,
      palette: result.palette,
      needsInput: result.needsInput,
      seconds: result.seconds,
    })),
  )

  for (const result of results) {
    if (result.notes.length) {
      console.log(`\n${result.case}:`)
      for (const note of result.notes) console.log(`- ${note}`)
    }
  }

  printConvergenceWarnings(results)

  if (results.some((result) => result.schemaInvalid)) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
