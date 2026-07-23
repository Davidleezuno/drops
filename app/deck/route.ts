import { readFile } from 'node:fs/promises'
import path from 'node:path'

export const runtime = 'nodejs'

export async function GET() {
  const deck = await readFile(path.join(process.cwd(), 'public', 'deck.html'), 'utf8')

  return new Response(deck, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
}
