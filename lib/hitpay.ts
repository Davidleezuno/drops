const HITPAY_SANDBOX_URL =
  'https://api.sandbox.hit-pay.com/v1/payment-requests'
const HITPAY_REQUEST_TIMEOUT_MS = 10_000

export type HitPayPaymentRequest = {
  id: string
  url: string
}

export class HitPayRequestError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'HitPayRequestError'
    this.status = status
  }
}

export async function createHitPayPaymentRequest(
  {
    amount,
    referenceNumber,
    purpose,
    buyerName,
    buyerContact,
    redirectUrl,
  }: {
    amount: string
    referenceNumber: string
    purpose: string
    buyerName: string
    buyerContact: string
    redirectUrl: string
  },
  {
    apiKey = process.env.HITPAY_API_KEY,
    fetcher = fetch,
    endpoint = HITPAY_SANDBOX_URL,
  }: {
    apiKey?: string
    fetcher?: typeof fetch
    endpoint?: string
  } = {},
): Promise<HitPayPaymentRequest> {
  if (!apiKey) throw new HitPayRequestError('HitPay is not configured')

  const body = new URLSearchParams()
  body.set('amount', amount)
  body.set('currency', 'SGD')
  body.append('payment_methods[]', 'paynow_online')
  body.set('reference_number', referenceNumber)
  body.set('purpose', purpose.slice(0, 255))
  body.set('name', buyerName)
  body.set('redirect_url', redirectUrl)
  body.set('allow_repeated_payments', 'false')

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerContact)) {
    body.set('email', buyerContact)
  } else {
    body.set('phone', buyerContact)
  }

  let response: Response
  try {
    response = await fetcher(endpoint, {
      method: 'POST',
      headers: {
        'X-BUSINESS-API-KEY': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(HITPAY_REQUEST_TIMEOUT_MS),
    })
  } catch (error) {
    const timedOut =
      error instanceof Error &&
      (error.name === 'AbortError' || error.name === 'TimeoutError')

    throw new HitPayRequestError(
      timedOut ? 'HitPay checkout timed out' : 'HitPay could not be reached',
    )
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new HitPayRequestError(
      'HitPay returned an unreadable response',
      response.status,
    )
  }

  if (!response.ok) {
    throw new HitPayRequestError(
      messageFromHitPay(payload) ?? 'HitPay could not create the checkout',
      response.status,
    )
  }

  if (
    !payload ||
    typeof payload !== 'object' ||
    typeof (payload as Record<string, unknown>).id !== 'string' ||
    typeof (payload as Record<string, unknown>).url !== 'string'
  ) {
    throw new HitPayRequestError('HitPay returned an incomplete checkout')
  }

  return {
    id: (payload as Record<string, string>).id,
    url: (payload as Record<string, string>).url,
  }
}

function messageFromHitPay(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const value = payload as Record<string, unknown>

  if (typeof value.message === 'string') return value.message
  if (typeof value.error === 'string') return value.error
  return null
}

export type HitPayCompletedEvent = {
  id: string
  referenceNumber: string
  status: 'completed'
  payload: Record<string, unknown>
}

export function parseHitPayCompletedEvent(
  input: unknown,
): HitPayCompletedEvent | null {
  if (!input || typeof input !== 'object') {
    throw new Error('Webhook body must be a JSON object')
  }

  const payload = input as Record<string, unknown>
  if (payload.status !== 'completed') return null

  if (typeof payload.id !== 'string' || payload.id.length === 0) {
    throw new Error('Webhook is missing its payment request id')
  }

  if (
    typeof payload.reference_number !== 'string' ||
    payload.reference_number.length === 0
  ) {
    throw new Error('Webhook is missing its reference number')
  }

  return {
    id: payload.id,
    referenceNumber: payload.reference_number,
    status: 'completed',
    payload,
  }
}
