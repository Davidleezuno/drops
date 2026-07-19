/**
 * Live smoke test: `pnpm tsx scripts/smoke-draft-agent.ts docs/test-images/set_1.jpeg`
 */
import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'

import {
  buildDropDraftMessages,
  createDropDraftAgent,
} from '@/lib/agents/drop-draft-agent'
import type { DraftImage } from '@/lib/agents/types'
import { dropDraftSchema } from '@/lib/drop-builder'
import { clampTheme } from '@/lib/theme'

const mediaTypes: Record<string, string> = {
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

async function main() {
  const imagePaths = process.argv.slice(2)

  if (!imagePaths.length) {
    throw new Error(
      'Usage: pnpm tsx scripts/smoke-draft-agent.ts <image> [image...]',
    )
  }

  const images: DraftImage[] = await Promise.all(
    imagePaths.map(async (imagePath) => {
      const mediaType = mediaTypes[extname(imagePath).toLowerCase()]
      if (!mediaType) throw new Error(`Unsupported image extension: ${imagePath}`)
      return { bytes: new Uint8Array(await readFile(imagePath)), mediaType }
    }),
  )

  const agent = createDropDraftAgent(images)
  const { output } = await agent.generate({
    messages: buildDropDraftMessages(images),
  })
  const draft = dropDraftSchema.parse({
    ...output,
    theme: clampTheme(output.theme),
    paletteCandidates: output.paletteCandidates.map((accent) =>
      clampTheme({ ...output.theme, accent }).accent,
    ),
  })

  if (
    !draft.paletteCandidates.some(
      (candidate) =>
        JSON.stringify(candidate) === JSON.stringify(draft.theme.accent),
    )
  ) {
    throw new Error('theme.accent is not one of paletteCandidates')
  }

  console.log(JSON.stringify(draft, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
