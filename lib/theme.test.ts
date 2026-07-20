import { describe, expect, it } from 'vitest'

import { storefrontThemeSchema, type StorefrontTheme } from './drop-builder'
import { clampTheme, oklchString } from './theme'

type Accent = StorefrontTheme['accent']

const baseTheme: StorefrontTheme = {
  accent: { l: 0.62, c: 0.14, h: 55 },
  archetype: 'menu',
  vertical: 'fnb',
  hero: {
    source: 'upload-crop',
    sourceImageIndex: 0,
    crop: { x: 0, y: 0, w: 1, h: 0.4 },
  },
  voice: {
    dropTitle: 'Night bake',
    sellerNote: 'Fresh from the oven.',
    tone: 'warm',
  },
  ogCard: { headline: 'Fresh tonight', badge: '12 only' },
}

function relativeLuminance({ l, c, h }: Accent) {
  const hue = (h * Math.PI) / 180
  const a = c * Math.cos(hue)
  const b = c * Math.sin(hue)
  const lRoot = l + 0.3963377774 * a + 0.2158037573 * b
  const mRoot = l - 0.1055613458 * a - 0.0638541728 * b
  const sRoot = l - 0.0894841775 * a - 1.291485548 * b
  const lValue = lRoot ** 3
  const mValue = mRoot ** 3
  const sValue = sRoot ** 3
  const clamp = (value: number) => Math.min(1, Math.max(0, value))
  const r = clamp(
    4.0767416621 * lValue -
      3.3077115913 * mValue +
      0.2309699292 * sValue,
  )
  const g = clamp(
    -1.2684380046 * lValue +
      2.6097574011 * mValue -
      0.3413193965 * sValue,
  )
  const blue = clamp(
    -0.0041960863 * lValue -
      0.7034186147 * mValue +
      1.707614701 * sValue,
  )

  return 0.2126 * r + 0.7152 * g + 0.0722 * blue
}

function contrastRatio(first: Accent, second: Accent) {
  const firstLuminance = relativeLuminance(first)
  const secondLuminance = relativeLuminance(second)
  const lighter = Math.max(firstLuminance, secondLuminance)
  const darker = Math.min(firstLuminance, secondLuminance)

  return (lighter + 0.05) / (darker + 0.05)
}

describe('clampTheme', () => {
  it('is idempotent and sanitizes copy and crop data', () => {
    const unsafeTheme = {
      ...baseTheme,
      accent: { l: 1, c: 1, h: 55 },
      hero: {
        source: 'upload-crop' as const,
        sourceImageIndex: 0,
        crop: { x: -1, y: 0.2, w: 3, h: 0.6 },
      },
      voice: {
        ...baseTheme.voice,
        dropTitle: '  Night\u0000   bake  ',
        sellerNote: '  Fresh\n  tonight.  ',
      },
      ogCard: { headline: ' Fresh\t tonight ', badge: ' 12\n only ' },
    }

    const once = clampTheme(unsafeTheme)

    expect(storefrontThemeSchema.parse(once)).toEqual(once)
    expect(clampTheme(once)).toEqual(once)
    expect(once.voice.dropTitle).toBe('Night bake')
    expect(once.voice.sellerNote).toBe('Fresh tonight.')
    expect(once.ogCard).toEqual({
      headline: 'Fresh tonight',
      badge: '12 only',
    })
  })

  it.each(Array.from({ length: 24 }, (_, index) => index * 15))(
    'keeps hue %i at 4.5:1 contrast after clamping',
    (h) => {
      const theme = clampTheme({
        ...baseTheme,
        accent: { l: 1, c: 1, h },
      })
      const court = { l: 0.9873, c: 0.0034, h: 84 }

      expect(contrastRatio(theme.accent, court)).toBeGreaterThanOrEqual(4.5)
    },
  )

  it('trims generated copy to the persisted schema limits', () => {
    const theme = clampTheme({
      ...baseTheme,
      voice: {
        ...baseTheme.voice,
        dropTitle: 'D'.repeat(80),
        sellerNote: 'S'.repeat(180),
      },
      ogCard: {
        headline: 'H'.repeat(80),
        badge: 'B'.repeat(40),
      },
    })

    expect(storefrontThemeSchema.parse(theme)).toEqual(theme)
    expect(theme.voice.dropTitle).toHaveLength(60)
    expect(theme.voice.sellerNote).toHaveLength(140)
    expect(theme.ogCard.headline).toHaveLength(48)
    expect(theme.ogCard.badge).toHaveLength(24)
  })
})

describe('oklchString', () => {
  it('formats components to at most three significant decimals', () => {
    expect(oklchString({ l: 0.62, c: 0.14, h: 55 })).toBe(
      'oklch(0.62 0.14 55)',
    )
    expect(oklchString({ l: 0.62387, c: 0.14382, h: 55.489 })).toBe(
      'oklch(0.624 0.144 55.5)',
    )
  })
})
