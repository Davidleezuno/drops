import { ImageResponse } from 'next/og'

import { createServiceClient } from '@/lib/db'
import { storefrontThemeSchema } from '@/lib/drop-builder'
import { oklchString } from '@/lib/theme'

export const runtime = 'nodejs'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Drop storefront card'

const FLAME = 'oklch(0.6301 0.1806 40)'
const INK = 'oklch(0.2444 0.0135 62)'
const COURT = 'oklch(0.9873 0.0034 84)'

type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
type LoadedFont = {
  name: string
  data: ArrayBuffer
  weight: FontWeight
  style: 'normal' | 'italic'
}

let fontsPromise: Promise<LoadedFont[]> | null = null

function loadFonts() {
  if (!fontsPromise) {
    fontsPromise = (async () => {
      const sources: Array<{
        name: string
        url: string
        weight: FontWeight
        style: 'normal' | 'italic'
      }> = [
        {
          name: 'Instrument',
          url: 'https://cdn.jsdelivr.net/fontsource/fonts/instrument-sans@latest/latin-400-normal.ttf',
          weight: 400,
          style: 'normal',
        },
        {
          name: 'Instrument',
          url: 'https://cdn.jsdelivr.net/fontsource/fonts/instrument-sans@latest/latin-700-normal.ttf',
          weight: 700,
          style: 'normal',
        },
        {
          name: 'Bricolage',
          url: 'https://cdn.jsdelivr.net/fontsource/fonts/bricolage-grotesque@latest/latin-700-normal.ttf',
          weight: 700,
          style: 'normal',
        },
      ]
      const results = await Promise.all(
        sources.map(async (source) => {
          const response = await fetch(source.url, { next: { revalidate: 86400 } })
          const data = await response.arrayBuffer()
          return {
            name: source.name,
            data,
            weight: source.weight,
            style: source.style,
          }
        }),
      )
      return results
    })()
  }
  return fontsPromise
}

type DropRow = {
  seller_name: string
  seller_slug: string
  drop_slug: string
  theme: unknown
}

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ seller: string; drop: string }>
}) {
  const fonts = await loadFonts()
  const { seller, drop: dropSlug } = await params
  const supabase = createServiceClient()
  const { data: drop } = await supabase
    .from('drops')
    .select('seller_name, seller_slug, drop_slug, theme')
    .eq('seller_slug', seller)
    .eq('drop_slug', dropSlug)
    .maybeSingle<DropRow>()

  if (!drop) {
    return new Response(null, { status: 404 })
  }

  const parsed = drop.theme ? storefrontThemeSchema.safeParse(drop.theme) : null
  const theme = parsed?.success ? parsed.data : null
  const accent = theme ? oklchString(theme.accent) : FLAME
  const headline = theme ? theme.ogCard.headline : drop.drop_slug
  const badge = theme?.ogCard.badge ?? null
  const sellerName = drop.seller_name || drop.seller_slug
  const basePath = `drops.sg/${drop.seller_slug}/${drop.drop_slug}`

  return new ImageResponse(
    <Card
      accent={accent}
      sellerName={sellerName}
      headline={headline}
      badge={badge}
      basePath={basePath}
    />,
    { ...size, fonts },
  )
}

function Card({
  accent,
  sellerName,
  headline,
  badge,
  basePath,
}: {
  accent: string
  sellerName: string
  headline: string
  badge: string | null
  basePath: string
}) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px',
        background: COURT,
        color: INK,
        fontFamily: 'Instrument',
        fontSize: 28,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: 999,
            background: accent,
          }}
        />
        <span
          style={{
            fontFamily: 'Instrument',
            fontSize: 26,
            color: INK,
            letterSpacing: -0.2,
          }}
        >
          {basePath}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <span
          style={{
            fontFamily: 'Instrument',
            fontSize: 26,
            color: accent,
            letterSpacing: 2,
            textTransform: 'uppercase' as const,
          }}
        >
          {sellerName}
        </span>
        <span
          style={{
            fontFamily: 'Bricolage',
            fontSize: headline.length > 28 ? 76 : 96,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: -2,
            color: INK,
            maxWidth: 1000,
          }}
        >
          {headline}
        </span>
      </div>

      {badge && (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span
            style={{
              fontFamily: 'Instrument',
              fontSize: 30,
              fontWeight: 700,
              color: COURT,
              background: accent,
              borderRadius: 999,
              padding: '14px 28px',
              letterSpacing: -0.3,
            }}
          >
            {badge}
          </span>
        </div>
      )}
    </div>
  )
}

