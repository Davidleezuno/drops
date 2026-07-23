'use client'

import { type FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { LayoutGrid, Store } from 'lucide-react'

import { Button } from '@/components/ui/button'
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
import { Textarea } from '@/components/ui/textarea'
import type { OrderStatus as PaymentStatus } from '@/lib/types'

const STATUS_POLL_INTERVAL_MS = 2_000
const FALLBACK_DELAY_MS = 10_000
const FALLBACK_RETRY_INTERVAL_MS = 10_000
const MAX_BUYER_NOTE_LENGTH = 180

export type BuyerOrder = {
  id: string
  status: PaymentStatus
  productName: string
  variant: string | null
  quantity: number
  amount: number
  fulfilment: 'pickup' | 'delivery'
  sellerName: string
  buyerNote: string | null
  storePath: string
}

export function OrderStatus({ order }: { order: BuyerOrder }) {
  const [status, setStatus] = useState(order.status)
  const [waitingLonger, setWaitingLonger] = useState(false)
  const [buyerNote, setBuyerNote] = useState(order.buyerNote)
  const [noteDraft, setNoteDraft] = useState('')
  const [noteError, setNoteError] = useState<string | null>(null)
  const [sendingNote, setSendingNote] = useState(false)

  async function sendNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const note = noteDraft.trim()
    if (!note || sendingNote) return

    setSendingNote(true)
    setNoteError(null)
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      })
      const result = (await response.json()) as { note?: string; error?: string }
      if (!response.ok || !result.note) {
        throw new Error(result.error ?? 'Could not send your note')
      }
      setBuyerNote(result.note)
      setNoteDraft('')
    } catch (caught) {
      setNoteError(
        caught instanceof Error ? caught.message : 'Could not send your note',
      )
    } finally {
      setSendingNote(false)
    }
  }

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
          <>
            <Poster variant="paid" title="Paid ✓" className="py-12">
              {order.sellerName} has your order. Keep this page for your records.
            </Poster>

            <nav
              aria-label="Continue shopping"
              className="mt-4 grid gap-2 sm:grid-cols-2"
            >
              <Button
                size="lg"
                nativeButton={false}
                render={<Link href={order.storePath} />}
                className="h-11"
              >
                <Store />
                Return to store
              </Button>
              <Button
                size="lg"
                variant="outline"
                nativeButton={false}
                render={<Link href={`${order.storePath}?list=1`} />}
                className="h-11 bg-background"
              >
                <LayoutGrid />
                Browse other items
              </Button>
            </nav>

            <Card className="mt-6 overflow-hidden border-flame/20 bg-flame-soft/45">
              <CardHeader>
                <p className="font-mono text-[10px] tracking-[0.18em] text-flame uppercase">
                  Wall of thanks
                </p>
                <CardTitle className="font-display text-2xl">
                  Leave a note for {order.sellerName}
                </CardTitle>
                <CardDescription className="max-w-sm leading-relaxed">
                  A short thank-you will appear in the store for other shoppers
                  to see. Don&rsquo;t include private information.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {buyerNote ? (
                  <div role="status" className="rounded-xl border border-live/20 bg-white/75 p-4">
                    <p className="font-medium">Your note is on the wall.</p>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/70">
                      &ldquo;{buyerNote}&rdquo;
                    </p>
                  </div>
                ) : (
                  <form onSubmit={sendNote} className="space-y-3">
                    <label htmlFor="buyer-note" className="sr-only">
                      Note to seller
                    </label>
                    <Textarea
                      id="buyer-note"
                      value={noteDraft}
                      maxLength={MAX_BUYER_NOTE_LENGTH}
                      rows={3}
                      placeholder="Loved this drop — can’t wait to receive it!"
                      className="min-h-24 resize-none bg-white/80"
                      aria-describedby="buyer-note-help buyer-note-status"
                      aria-invalid={Boolean(noteError)}
                      onChange={(event) => setNoteDraft(event.target.value)}
                    />
                    <div className="flex items-center justify-between gap-4">
                      <p id="buyer-note-help" className="font-mono text-[10px] text-muted-foreground tabular-nums">
                        {noteDraft.length}/{MAX_BUYER_NOTE_LENGTH}
                      </p>
                      <Button
                        type="submit"
                        size="lg"
                        disabled={!noteDraft.trim() || sendingNote}
                      >
                        {sendingNote ? 'Sending…' : 'Add to the wall'}
                      </Button>
                    </div>
                    <p
                      id="buyer-note-status"
                      role="status"
                      className="min-h-5 text-sm text-destructive"
                    >
                      {noteError}
                    </p>
                  </form>
                )}
              </CardContent>
            </Card>
          </>
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
