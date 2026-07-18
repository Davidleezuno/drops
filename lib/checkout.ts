export type BuyRequest = {
  productId: string
  quantity: number
  buyerName: string
  buyerContact: string
  fulfilment: 'pickup' | 'delivery'
  address: string | null
}

export type BuyRequestResult =
  | { ok: true; value: BuyRequest }
  | { ok: false; error: string }

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function requiredString(
  value: unknown,
  label: string,
  maxLength: number,
): string | BuyRequestResult {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return { ok: false, error: `${label} is required` }
  }

  const trimmed = value.trim()
  if (trimmed.length > maxLength) {
    return { ok: false, error: `${label} is too long` }
  }

  return trimmed
}

export function parseBuyRequest(input: unknown): BuyRequestResult {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'Invalid checkout details' }
  }

  const body = input as Record<string, unknown>
  if (typeof body.productId !== 'string' || !UUID_PATTERN.test(body.productId)) {
    return { ok: false, error: 'Invalid product' }
  }

  if (!Number.isSafeInteger(body.quantity) || Number(body.quantity) <= 0) {
    return { ok: false, error: 'Quantity must be a positive whole number' }
  }

  const buyerName = requiredString(body.buyerName, 'Name', 120)
  if (typeof buyerName !== 'string') return buyerName

  const buyerContact = requiredString(body.buyerContact, 'Contact', 200)
  if (typeof buyerContact !== 'string') return buyerContact

  if (body.fulfilment !== 'pickup' && body.fulfilment !== 'delivery') {
    return { ok: false, error: 'Choose pickup or delivery' }
  }

  let address: string | null = null
  if (body.fulfilment === 'delivery') {
    const parsedAddress = requiredString(body.address, 'Delivery address', 500)
    if (typeof parsedAddress !== 'string') return parsedAddress
    address = parsedAddress
  }

  return {
    ok: true,
    value: {
      productId: body.productId,
      quantity: Number(body.quantity),
      buyerName,
      buyerContact,
      fulfilment: body.fulfilment,
      address,
    },
  }
}

export function fulfilmentIsAvailable(
  configured: 'pickup' | 'delivery' | 'both',
  requested: 'pickup' | 'delivery',
): boolean {
  return configured === 'both' || configured === requested
}
