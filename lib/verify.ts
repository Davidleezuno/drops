import { createHmac, timingSafeEqual } from 'node:crypto'

const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/i

/** Verify HitPay's per-webhook-salt signature over the untouched body bytes. */
export function verifyHitPaySignature(
  body: Uint8Array | string,
  signature: string | null,
  salt: string,
): boolean {
  const normalized = signature?.trim()
  if (!normalized || !SHA256_HEX_PATTERN.test(normalized) || !salt) return false

  const expected = createHmac('sha256', salt).update(body).digest()
  const actual = Buffer.from(normalized, 'hex')

  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
