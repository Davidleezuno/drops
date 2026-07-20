import type { StorefrontTheme } from '@/lib/drop-builder'

type Accent = StorefrontTheme['accent']
type Rgb = { r: number; g: number; b: number }

export type ScopeVars = Record<string, string>

const MIN_LIGHTNESS = 0.45
const MAX_LIGHTNESS = 0.75
const MIN_CHROMA = 0.05
const MAX_CHROMA = 0.25
const MIN_CONTRAST = 4.5
const MIN_HERO_ASPECT = 16 / 7
const COURT: Accent = { l: 0.9873, c: 0.0034, h: 84 }

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

function oklchToLinearSrgb({ l, c, h }: Accent): Rgb {
  const hue = (h * Math.PI) / 180
  const a = c * Math.cos(hue)
  const b = c * Math.sin(hue)

  const lRoot = l + 0.3963377774 * a + 0.2158037573 * b
  const mRoot = l - 0.1055613458 * a - 0.0638541728 * b
  const sRoot = l - 0.0894841775 * a - 1.291485548 * b
  const lValue = lRoot ** 3
  const mValue = mRoot ** 3
  const sValue = sRoot ** 3

  return {
    r: clamp(
      4.0767416621 * lValue -
        3.3077115913 * mValue +
        0.2309699292 * sValue,
      0,
      1,
    ),
    g: clamp(
      -1.2684380046 * lValue +
        2.6097574011 * mValue -
        0.3413193965 * sValue,
      0,
      1,
    ),
    b: clamp(
      -0.0041960863 * lValue -
        0.7034186147 * mValue +
        1.707614701 * sValue,
      0,
      1,
    ),
  }
}

function linearToSrgb(value: number) {
  return value <= 0.0031308
    ? value * 12.92
    : 1.055 * value ** (1 / 2.4) - 0.055
}

/** Three.js does not consistently parse CSS oklch(), so world materials use
 * the same accent converted deterministically to an sRGB hex color. */
export function oklchHex(accent: Accent) {
  const linear = oklchToLinearSrgb(accent)
  const channel = (value: number) =>
    Math.round(clamp(linearToSrgb(value), 0, 1) * 255)
      .toString(16)
      .padStart(2, '0')

  return `#${channel(linear.r)}${channel(linear.g)}${channel(linear.b)}`
}

function relativeLuminance(accent: Accent) {
  const { r, g, b } = oklchToLinearSrgb(accent)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio(first: Accent, second: Accent) {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second))
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second))
  return (lighter + 0.05) / (darker + 0.05)
}

export function clampAccent(accent: Accent): Accent {
  const candidate = {
    l: clamp(accent.l, MIN_LIGHTNESS, MAX_LIGHTNESS),
    c: clamp(accent.c, MIN_CHROMA, MAX_CHROMA),
    h: clamp(accent.h, 0, 360),
  }

  if (contrastRatio(candidate, COURT) >= MIN_CONTRAST) return candidate

  let passingLightness = MIN_LIGHTNESS
  let failingLightness = candidate.l

  for (let index = 0; index < 32; index += 1) {
    const lightness = (passingLightness + failingLightness) / 2
    const trial = { ...candidate, l: lightness }

    if (contrastRatio(trial, COURT) >= MIN_CONTRAST) {
      passingLightness = lightness
    } else {
      failingLightness = lightness
    }
  }

  return { ...candidate, l: passingLightness }
}

function sanitize(value: string) {
  return value.replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').replace(/\s+/g, ' ').trim()
}

function sanitizeNullable(value: string | null) {
  return value === null ? null : sanitize(value)
}

function clampHero(hero: StorefrontTheme['hero']): StorefrontTheme['hero'] {
  if (
    hero.source !== 'upload-crop' ||
    hero.sourceImageIndex === null ||
    hero.crop === null ||
    !Object.values(hero.crop).every(Number.isFinite)
  ) {
    return { source: 'none', sourceImageIndex: null, crop: null }
  }

  const x = clamp(hero.crop.x, 0, 1)
  const y = clamp(hero.crop.y, 0, 1)
  const w = clamp(hero.crop.w, 0, 1 - x)
  const h = clamp(hero.crop.h, 0, 1 - y)

  if (w <= 0 || h <= 0 || w / h < MIN_HERO_ASPECT) {
    return { source: 'none', sourceImageIndex: null, crop: null }
  }

  return {
    source: 'upload-crop',
    sourceImageIndex: clamp(Math.trunc(hero.sourceImageIndex), 0, 4),
    crop: { x, y, w, h },
  }
}

export function clampTheme(theme: StorefrontTheme): StorefrontTheme {
  const dropTitle = sanitize(theme.voice.dropTitle)
  const headline = sanitize(theme.ogCard.headline)

  return {
    ...theme,
    accent: clampAccent(theme.accent),
    hero: clampHero(theme.hero),
    voice: {
      ...theme.voice,
      dropTitle: dropTitle || 'Drop',
      sellerNote: sanitizeNullable(theme.voice.sellerNote),
    },
    ogCard: {
      headline: headline || 'Drop',
      badge: sanitizeNullable(theme.ogCard.badge),
    },
  }
}

function formatOklchNumber(value: number) {
  return Number(value.toPrecision(3)).toString()
}

export function oklchString({ l, c, h }: Accent) {
  return `oklch(${formatOklchNumber(l)} ${formatOklchNumber(c)} ${formatOklchNumber(h)})`
}

/**
 * Inline CSS-variable scope for a themed storefront (spec §8.1). Apply on a
 * wrapping div's `style` so identity-components downstream resolve
 * `--seller-accent`/`--seller-accent-soft`.
 */
export function storefrontScopeVars(theme: StorefrontTheme): ScopeVars {
  return {
    '--seller-accent': oklchString(theme.accent),
    '--seller-accent-soft': oklchString({
      l: 0.95,
      c: theme.accent.c * 0.25,
      h: theme.accent.h,
    }),
  }
}
