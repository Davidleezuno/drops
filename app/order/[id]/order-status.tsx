'use client'

import { useEffect, useState } from 'react'

import { Poster } from '@/components/ds/poster'
import { Price } from '@/components/ds/price'
import { StatusPill } from '@/components/ds/status-pill'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { OrderStatus as PaymentStatus } from '@/lib/types'

const STATUS_POLL_INTERVAL_MS = 2_000
const FALLBACK_DELAY_MS = 10_000
const FALLBACK_RETRY_INTERVAL_MS = 10_000

export type BuyerOrder = {
  id: string
  status: PaymentStatus
  productName: string
  variant: string | null
  quantity: number
  amount: number
  fulfilment: 'pickup' | 'delivery'
  sellerName: string
}

export function OrderStatus({ order }: { order: BuyerOrder }) {
  const [status, setStatus] = useState(order.status)
  const [waitingLonger, setWaitingLonger] = useState(false)

  useEffect(() => {
    if (status !== 'PENDING') return

    let active = true
    let inFlight = false
    const startedAt = Date.now()
    let lastFallbackAt = 0

    async function checkStatus() {
      if (inFlight) return
      inFlight = true

      const now = Date.now()
      const useFallback =
        now - startedAt >= FALLBACK_DELAY_MS &&
        now - lastFallbackAt >= FALLBACK_RETRY_INTERVAL_MS
      if (useFallback) lastFallbackAt = now

      try {
        const response = await fetch(`/api/orders/${order.id}`, {
          method: useFallback ? 'POST' : 'GET',
          cache: 'no-store',
        })
        if (!response.ok) return

        const result = (await response.json()) as { status?: PaymentStatus }
        if (
          active &&
          (result.status === 'PAID' || result.status === 'PAID_LATE')
        ) {
          setStatus(result.status)
        }
      } catch {
        // Keep the trust surface calm through transient network failures. The
        // next interval retries the database check and periodic HitPay fallback.
      } finally {
        inFlight = false
      }
    }

    void checkStatus()
    const poller = window.setInterval(checkStatus, STATUS_POLL_INTERVAL_MS)
    const longerWait = window.setTimeout(
      () => setWaitingLonger(true),
      FALLBACK_DELAY_MS + 5_000,
    )

    return () => {
      active = false
      window.clearInterval(poller)
      window.clearTimeout(longerWait)
    }
  }, [order.id, status])

  return (
    <>
      <header className="mb-8">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Your order from
        </p>
        <h1 className="mt-2 font-display text-4xl leading-tight font-semibold tracking-tight">
          {order.sellerName}
        </h1>
      </header>

      <div aria-live="polite">
        {status === 'PENDING' && (
          <Card className="py-8">
            <CardHeader className="items-center text-center">
              <Skeleton className="mb-3 size-12 rounded-full" />
              <CardTitle className="text-xl">Confirming payment…</CardTitle>
              <CardDescription className="max-w-xs leading-relaxed">
                Keep this page open. We&rsquo;ll confirm the moment HitPay does
                — usually a few seconds.
              </CardDescription>
            </CardHeader>
            {waitingLonger && (
              <CardContent>
                <p className="text-center text-xs leading-relaxed text-muted-foreground">
                  Still checking — this sometimes takes a minute. Your payment
                  is safe; nothing needs doing on your end.
                </p>
              </CardContent>
            )}
          </Card>
        )}

        {status === 'PAID' && (
          <Poster variant="paid" title="Paid ✓" className="py-12">
            {order.sellerName} has your order. Keep this page for your records.
          </Poster>
        )}

        {status === 'PAID_LATE' && (
          <Card className="bg-alarm-soft py-8 ring-alarm/20">
            <CardHeader>
              <div className="mb-3">
                <StatusPill status="PAID_LATE" />
              </div>
              <CardTitle className="font-display text-3xl">
                The drop sold out first
              </CardTitle>
              <CardDescription className="leading-relaxed text-foreground/70">
                Your payment landed after the last item was claimed, so there
                is nothing to fulfil. {order.sellerName} will refund you in
                full through HitPay.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Order summary</CardTitle>
          <CardDescription className="font-mono text-xs">
            #{order.id.slice(0, 8)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold">{order.productName}</p>
              {order.variant && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {order.variant}
                </p>
              )}
              <p className="mt-2 text-sm text-muted-foreground">
                Quantity {order.quantity} ·{' '}
                <span className="capitalize">{order.fulfilment}</span>
              </p>
            </div>
            <Price amount={order.amount} className="text-base" />
          </div>
        </CardContent>
      </Card>
    </>
  )
}
