/**
 * Live smoke test: `pnpm tsx scripts/smoke-draft-agent.ts docs/test-images/set_1.jpeg`
 */
import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'

import { generateDropDraft } from '@/lib/agents/drop-draft-agent'
import type { DraftImage } from '@/lib/agents/types'
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

  const { draft: generatedDraft, timing } = await generateDropDraft(images)
  const draft = {
    ...generatedDraft,
    theme: clampTheme(generatedDraft.theme),
  }

  console.log(JSON.stringify(draft, null, 2))
  console.error(
    `Generated in ${(timing.totalMs / 1_000).toFixed(1)}s ` +
      `(catalog ${(timing.catalogMs / 1_000).toFixed(1)}s, ` +
      `theme ${(timing.themeMs / 1_000).toFixed(1)}s, ` +
      `fallback: ${timing.fallbackParts.join(', ') || 'none'})`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
