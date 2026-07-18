const SGD_SCALE = 100

/** Convert a Postgres numeric/JS number into integer cents without float math. */
export function sgdToCents(value: number | string): number {
  const normalized = String(value).trim()
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized)

  if (!match) {
    throw new Error(`Invalid SGD amount: ${normalized}`)
  }

  const whole = Number(match[1])
  const fraction = Number((match[2] ?? '').padEnd(2, '0'))
  const cents = whole * SGD_SCALE + fraction

  if (!Number.isSafeInteger(cents)) {
    throw new Error('SGD amount is outside the supported range')
  }

  return cents
}

export function centsToSgd(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new Error('Cents must be a non-negative safe integer')
  }

  return (cents / SGD_SCALE).toFixed(2)
}

export function orderTotalCents({
  unitPrice,
  quantity,
  deliveryFee,
  fulfilment,
}: {
  unitPrice: number | string
  quantity: number
  deliveryFee: number | string
  fulfilment: 'pickup' | 'delivery'
}): number {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new Error('Quantity must be a positive integer')
  }

  return (
    sgdToCents(unitPrice) * quantity +
    (fulfilment === 'delivery' ? sgdToCents(deliveryFee) : 0)
  )
}
