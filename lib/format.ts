export const sgd = new Intl.NumberFormat("en-SG", {
  style: "currency",
  currency: "SGD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

/**
 * The host shown in URL eyebrows. Read from the deploy's own origin so the
 * link a seller reads is always the link they actually copy.
 */
export function siteHost() {
  const configured = process.env.NEXT_PUBLIC_APP_URL
  if (!configured) return "drops.sg"

  try {
    return new URL(configured).host
  } catch {
    return "drops.sg"
  }
}

export function slugify(value: string, fallback: string) {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)

  return slug || fallback
}
