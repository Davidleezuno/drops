import { createClient } from '@supabase/supabase-js'
import { createHmac, randomBytes } from 'node:crypto'

const HITPAY_PAYMENT_REQUESTS_URL =
  'https://api.sandbox.hit-pay.com/v1/payment-requests'
const MAX_BUYERS = 50

function positiveInteger(value, label) {
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive whole number`)
  }
  return parsed
}

function parseOptions(args) {
  const options = { buyers: 12, stock: 4, keep: false }

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]

    if (argument === '--') continue

    if (argument === '--keep') {
      options.keep = true
      continue
    }

    if (argument === '--buyers' || argument === '--stock') {
      const value = args[index + 1]
      if (!value) throw new Error(`${argument} requires a value`)
      options[argument.slice(2)] = positiveInteger(value, argument)
      index += 1
      continue
    }

    throw new Error(`Unknown option: ${argument}`)
  }

  if (options.buyers <= options.stock) {
    throw new Error('--buyers must be greater than --stock to prove oversell handling')
  }
  if (options.buyers > MAX_BUYERS) {
    throw new Error(`--buyers must be ${MAX_BUYERS} or fewer to stay below HitPay's demo rate limit`)
  }

  return options
}

function requiredEnvironment(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

async function responseJson(response) {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return { raw: text.slice(0, 300) }
  }
}

function errorMessage(payload) {
  if (!payload || typeof payload !== 'object') return null
  if (typeof payload.error === 'string') return payload.error
  if (typeof payload.message === 'string') return payload.message
  return null
}

async function createCheckout({ appUrl, productId, buyerNumber }) {
  const response = await fetch(new URL('/api/buy', appUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productId,
      quantity: 1,
      buyerName: `Race buyer ${buyerNumber}`,
      buyerContact: `race-${buyerNumber}@example.com`,
      fulfilment: 'pickup',
      address: null,
    }),
  })
  const payload = await responseJson(response)

  if (!response.ok || typeof payload?.orderId !== 'string') {
    throw new Error(
      `Checkout ${buyerNumber} failed (${response.status}): ${errorMessage(payload) ?? 'invalid response'}`,
    )
  }

  return payload.orderId
}

function completedPayload(order) {
  return {
    id: order.hitpay_payment_request_id,
    amount: '0.30',
    currency: 'sgd',
    status: 'completed',
    reference_number: order.id,
    payment_type: 'sandbox_race_proof',
    created_at: new Date().toISOString(),
  }
}

async function deliverCompletion({ webhookUrl, salt, payload, signature = true }) {
  const rawBody = JSON.stringify(payload)
  const signed = createHmac('sha256', salt).update(rawBody).digest('hex')
  const startedAt = performance.now()
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Hitpay-Event-Type': 'completed',
      'Hitpay-Event-Object': 'payment_request',
      'Hitpay-Signature': signature ? signed : '0'.repeat(64),
    },
    body: rawBody,
  })

  return {
    status: response.status,
    durationMs: performance.now() - startedAt,
    payload: await responseJson(response),
  }
}

async function cancelPaymentRequest(paymentRequestId, apiKey) {
  const response = await fetch(
    `${HITPAY_PAYMENT_REQUESTS_URL}/${encodeURIComponent(paymentRequestId)}`,
    {
      method: 'DELETE',
      headers: { 'X-BUSINESS-API-KEY': apiKey },
    },
  )

  // A manually completed request may already be non-cancellable. The race
  // harness only requires that no unexpected server error is hidden.
  if (response.ok || response.status === 404 || response.status === 422) return

  const payload = await responseJson(response)
  throw new Error(
    `Could not cancel sandbox payment ${paymentRequestId} (${response.status}): ${errorMessage(payload) ?? 'unknown error'}`,
  )
}

async function deleteWhere(supabase, table, column, values) {
  if (!values.length) return
  const { error } = await supabase.from(table).delete().in(column, values)
  if (error) throw new Error(`Could not clean ${table}: ${error.message}`)
}

const options = parseOptions(process.argv.slice(2))
const appUrl = new URL(requiredEnvironment('NEXT_PUBLIC_APP_URL'))
const webhookUrl = new URL('/api/hitpay/webhook', appUrl)
const webhookSalt = requiredEnvironment('HITPAY_WEBHOOK_SALT')
const hitPayApiKey = requiredEnvironment('HITPAY_API_KEY')
const supabase = createClient(
  requiredEnvironment('NEXT_PUBLIC_SUPABASE_URL'),
  requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false } },
)

const suffix = `${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`
const fixture = {
  dropId: null,
  productId: null,
  orderIds: [],
  paymentRequestIds: [],
}

let failure = null

try {
  console.log(
    `Race proof: ${options.buyers} overlapping HitPay sandbox checkouts for ${options.stock} units`,
  )
  console.log(`Target: ${appUrl.origin}`)

  const { data: drop, error: dropError } = await supabase
    .from('drops')
    .insert({
      seller_name: 'Ticket 07 Race Proof',
      seller_slug: `race-proof-${suffix}`,
      drop_slug: 'concurrency',
      manage_token: randomBytes(32).toString('base64url'),
      fulfilment: 'pickup',
      delivery_fee: 0,
      pickup_note: 'Automated race fixture',
      window_ends_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      status: 'live',
    })
    .select('id, seller_slug, drop_slug, manage_token')
    .single()

  if (dropError) throw new Error(`Could not create race drop: ${dropError.message}`)
  fixture.dropId = drop.id

  const { data: product, error: productError } = await supabase
    .from('products')
    .insert({
      drop_id: drop.id,
      name: 'Last-unit race',
      variant: 'Automated sandbox proof',
      price: 0.3,
      stock_total: options.stock,
    })
    .select('id')
    .single()

  if (productError) {
    throw new Error(`Could not create race product: ${productError.message}`)
  }
  fixture.productId = product.id

  const checkoutResults = await Promise.allSettled(
    Array.from({ length: options.buyers }, (_, index) =>
      createCheckout({
        appUrl,
        productId: product.id,
        buyerNumber: index + 1,
      }),
    ),
  )
  const checkoutFailures = checkoutResults.filter(
    (result) => result.status === 'rejected',
  )
  fixture.orderIds = checkoutResults
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value)

  if (checkoutFailures.length) {
    throw new Error(
      `${checkoutFailures.length} sandbox checkouts failed; first error: ${checkoutFailures[0].reason}`,
    )
  }

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, status, hitpay_payment_request_id')
    .in('id', fixture.orderIds)

  if (ordersError) throw new Error(`Could not load race orders: ${ordersError.message}`)
  if (orders.length !== options.buyers) {
    throw new Error(`Expected ${options.buyers} orders, found ${orders.length}`)
  }
  if (orders.some((order) => !order.hitpay_payment_request_id)) {
    throw new Error('At least one race order is missing its HitPay payment request')
  }

  fixture.paymentRequestIds = orders.map(
    (order) => order.hitpay_payment_request_id,
  )

  const invalidSignature = await deliverCompletion({
    webhookUrl,
    salt: webhookSalt,
    payload: completedPayload(orders[0]),
    signature: false,
  })
  if (invalidSignature.status !== 401) {
    throw new Error(
      `Invalid signature check returned ${invalidSignature.status}, expected 401`,
    )
  }

  const deliveries = await Promise.all(
    orders.map((order) =>
      deliverCompletion({
        webhookUrl,
        salt: webhookSalt,
        payload: completedPayload(order),
      }),
    ),
  )
  const failedDeliveries = deliveries.filter((delivery) => delivery.status !== 200)
  if (failedDeliveries.length) {
    throw new Error(
      `${failedDeliveries.length} webhook deliveries failed; first status: ${failedDeliveries[0].status}`,
    )
  }

  const outcomeCounts = deliveries.reduce((counts, delivery) => {
    const outcome = delivery.payload?.outcome ?? 'missing'
    counts[outcome] = (counts[outcome] ?? 0) + 1
    return counts
  }, {})

  const duplicate = await deliverCompletion({
    webhookUrl,
    salt: webhookSalt,
    payload: completedPayload(orders[0]),
  })
  if (duplicate.status !== 200 || duplicate.payload?.outcome !== 'duplicate') {
    throw new Error('Duplicate webhook did not resolve as an idempotent no-op')
  }

  const [{ data: settledOrders, error: settledOrdersError }, { data: settledProduct, error: settledProductError }] =
    await Promise.all([
      supabase.from('orders').select('id, status').in('id', fixture.orderIds),
      supabase
        .from('products')
        .select('stock_total, stock_sold')
        .eq('id', product.id)
        .single(),
    ])

  if (settledOrdersError) {
    throw new Error(`Could not verify race orders: ${settledOrdersError.message}`)
  }
  if (settledProductError) {
    throw new Error(`Could not verify race stock: ${settledProductError.message}`)
  }

  const statuses = settledOrders.reduce((counts, order) => {
    counts[order.status] = (counts[order.status] ?? 0) + 1
    return counts
  }, {})
  const expectedLate = options.buyers - options.stock
  const invariantHolds =
    settledProduct.stock_sold === options.stock &&
    settledProduct.stock_sold <= settledProduct.stock_total &&
    statuses.PAID === options.stock &&
    statuses.PAID_LATE === expectedLate &&
    (statuses.PENDING ?? 0) === 0 &&
    outcomeCounts.paid === options.stock &&
    outcomeCounts.paid_late === expectedLate

  if (!invariantHolds) {
    throw new Error(
      `Race invariant failed: stock=${settledProduct.stock_sold}/${settledProduct.stock_total}, statuses=${JSON.stringify(statuses)}, outcomes=${JSON.stringify(outcomeCounts)}`,
    )
  }

  const durations = deliveries.map((delivery) => delivery.durationMs)
  console.log(`PASS: ${statuses.PAID} PAID, ${statuses.PAID_LATE} PAID_LATE, 0 PENDING`)
  console.log(`PASS: stock_sold=${settledProduct.stock_sold}, stock_total=${settledProduct.stock_total}`)
  console.log('PASS: invalid signature rejected and duplicate completion was a no-op')
  console.log(
    `Webhook responses: ${Math.min(...durations).toFixed(0)}–${Math.max(...durations).toFixed(0)} ms`,
  )
  if (options.keep) {
    console.log(`Storefront: ${new URL(`/${drop.seller_slug}/${drop.drop_slug}`, appUrl)}`)
    console.log(`Console: ${new URL(`/manage/${drop.manage_token}`, appUrl)}`)
  }
} catch (caught) {
  failure = caught instanceof Error ? caught : new Error(String(caught))
  console.error(`FAIL: ${failure.message}`)
} finally {
  const cleanupFailures = []

  if (fixture.productId) {
    const { data: fixtureOrders, error: fixtureOrdersError } = await supabase
      .from('orders')
      .select('id, hitpay_payment_request_id')
      .eq('product_id', fixture.productId)

    if (fixtureOrdersError) {
      cleanupFailures.push(
        new Error(`Could not discover fixture orders: ${fixtureOrdersError.message}`),
      )
    } else {
      fixture.orderIds = [
        ...new Set([...fixture.orderIds, ...fixtureOrders.map((order) => order.id)]),
      ]
      fixture.paymentRequestIds = [
        ...new Set([
          ...fixture.paymentRequestIds,
          ...fixtureOrders
            .map((order) => order.hitpay_payment_request_id)
            .filter(Boolean),
        ]),
      ]
    }
  }

  const cancellations = await Promise.allSettled(
    fixture.paymentRequestIds.map((id) =>
      cancelPaymentRequest(id, hitPayApiKey),
    ),
  )
  for (const result of cancellations) {
    if (result.status === 'rejected') cleanupFailures.push(result.reason)
  }

  if (options.keep) {
    console.log('Database fixture retained because --keep was passed; sandbox requests were cancelled.')
  } else {
    const eventIds = fixture.paymentRequestIds
    const cleanupSteps = [
      () => deleteWhere(supabase, 'webhook_events', 'event_id', eventIds),
      () => deleteWhere(supabase, 'orders', 'id', fixture.orderIds),
      () => deleteWhere(supabase, 'products', 'id', fixture.productId ? [fixture.productId] : []),
      () => deleteWhere(supabase, 'drops', 'id', fixture.dropId ? [fixture.dropId] : []),
    ]

    for (const cleanup of cleanupSteps) {
      try {
        await cleanup()
      } catch (caught) {
        cleanupFailures.push(caught)
      }
    }

    if (!cleanupFailures.length) {
      console.log('Cleaned sandbox payment requests and isolated database fixture.')
    }
  }

  if (cleanupFailures.length) {
    console.error(`Cleanup warning: ${cleanupFailures[0]}`)
    if (!failure) failure = new Error('Race passed, but fixture cleanup failed')
  }
}

if (failure) process.exitCode = 1
