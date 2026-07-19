'use client'

import Link from 'next/link'
import {
  AlertTriangle,
  Clock3,
  MapPin,
  PackageCheck,
  Square,
  Store,
  Truck,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { CopyList } from '@/components/ds/copy-list'
import { LivePill } from '@/components/ds/live-pill'
import { Price } from '@/components/ds/price'
import { StatusPill } from '@/components/ds/status-pill'
import { StockBadge } from '@/components/ds/stock-badge'
import { WatchingPill } from '@/components/ds/watching-pill'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { allSoldOut, stockRemaining } from '@/lib/drop-state'
import { siteHost } from '@/lib/format'
import { createClient } from '@/lib/supabase/client'
import type { ManageOrder, ManageSnapshot, Product } from '@/lib/types'
import { useDropSocial } from '@/lib/use-drop-social'

const ORDER_POLL_INTERVAL_MS = 2_000

const sgtDateTime = new Intl.DateTimeFormat('en-SG', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Singapore',
})

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
  }
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`
}

function ConsoleCountdown({ endsAt }: { endsAt: string }) {
  const [remaining, setRemaining] = useState(
    () => new Date(endsAt).getTime() - Date.now(),
  )

  useEffect(() => {
    const deadline = new Date(endsAt).getTime()
    const tick = () => setRemaining(deadline - Date.now())
    const ticker = window.setInterval(tick, 1_000)
    tick()
    return () => window.clearInterval(ticker)
  }, [endsAt])

  return <span suppressHydrationWarning>Ends in {formatRemaining(remaining)}</span>
}

function productLabel(order: ManageOrder) {
  return order.product_variant
    ? `${order.product_name} — ${order.product_variant}`
    : order.product_name
}

function orderFulfilment(order: ManageOrder, pickupNote: string | null) {
  if (order.fulfilment === 'delivery') {
    return `Delivery: ${order.address?.trim() || 'Address not provided'}`
  }
  return `Pickup: ${pickupNote?.trim() || 'Pickup details to follow'}`
}

function packingText(snapshot: ManageSnapshot, items: PackingItem[]) {
  const lines = items.length
    ? items.map((item) => `${item.quantity} × ${item.label}`)
    : ['No paid orders']

  return [
    `${snapshot.drop.seller_name} — ${snapshot.drop.drop_slug}`,
    'PACKING LIST',
    '',
    ...lines,
  ].join('\n')
}

function fulfilmentText(snapshot: ManageSnapshot, orders: ManageOrder[]) {
  const lines = orders.flatMap((order, index) => [
    `${index + 1}. ${order.buyer_name} — ${productLabel(order)} × ${order.qty}`,
    `   ${order.buyer_contact}`,
    `   ${orderFulfilment(order, snapshot.drop.pickup_note)}`,
    '',
  ])

  return [
    `${snapshot.drop.seller_name} — ${snapshot.drop.drop_slug}`,
    'FULFILMENT LIST',
    '',
    ...(lines.length ? lines : ['No paid orders']),
  ].join('\n')
}

type PackingItem = {
  productId: string
  label: string
  quantity: number
}

function buildPackingList(orders: ManageOrder[]) {
  const packed = new Map<string, PackingItem>()

  for (const order of orders) {
    const current = packed.get(order.product_id)
    if (current) {
      current.quantity += order.qty
    } else {
      packed.set(order.product_id, {
        productId: order.product_id,
        label: productLabel(order),
        quantity: order.qty,
      })
    }
  }

  return Array.from(packed.values()).sort((a, b) =>
    a.label.localeCompare(b.label),
  )
}

export function ManageConsole({
  token,
  initialSnapshot,
}: {
  token: string
  initialSnapshot: ManageSnapshot
}) {
  const supabase = useMemo(() => createClient(), [])
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [ending, setEnding] = useState(false)
  const [converting, setConverting] = useState(false)
  const refreshing = useRef(false)
  // Observe the crowd without counting the seller as a watcher.
  const social = useDropSocial(supabase, snapshot.drop.id, { present: false })

  const refreshConsole = useCallback(async () => {
    if (refreshing.current) return
    refreshing.current = true

    try {
      const response = await fetch(`/api/manage/${encodeURIComponent(token)}`, {
        cache: 'no-store',
      })
      if (!response.ok) throw new Error('Refresh failed')

      const next = (await response.json()) as ManageSnapshot
      setSnapshot(next)
      setRefreshError(null)
    } catch {
      setRefreshError(
        'Live updates paused. We will keep retrying automatically.',
      )
    } finally {
      refreshing.current = false
    }
  }, [token])

  useEffect(() => {
    const dropId = snapshot.drop.id
    let channel: ReturnType<typeof supabase.channel> | undefined

    try {
      channel = supabase
        .channel(`manage-${dropId}-products`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'products',
            filter: `drop_id=eq.${dropId}`,
          },
          (payload) => {
            const incoming = payload.new as Product
            if (incoming.drop_id !== dropId) return

            setSnapshot((current) => {
              const products = current.products.map((product) =>
                product.id === incoming.id
                  ? {
                      ...product,
                      ...incoming,
                      stock_sold: Math.max(
                        product.stock_sold,
                        incoming.stock_sold,
                      ),
                    }
                  : product,
              )

              return {
                ...current,
                products,
                settled: current.settled || allSoldOut(products),
              }
            })
            void refreshConsole()
          },
        )

      channel.subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          void refreshConsole()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Console stock realtime subscription failed', error)
        }
      })
    } catch (caught) {
      // The secure order refetch below remains live even when venue wifi or a
      // restrictive browser blocks Realtime's websocket entirely.
      console.warn('Console stock realtime connection unavailable', caught)
    }

    const poller = window.setInterval(refreshConsole, ORDER_POLL_INTERVAL_MS)
    const refreshOnFocus = () => void refreshConsole()
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refreshConsole()
    }

    window.addEventListener('focus', refreshOnFocus)
    document.addEventListener('visibilitychange', refreshWhenVisible)

    return () => {
      window.clearInterval(poller)
      window.removeEventListener('focus', refreshOnFocus)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
      if (channel) void supabase.removeChannel(channel)
    }
  }, [refreshConsole, snapshot.drop.id, supabase])

  async function keepLinkAlive() {
    const confirmed = window.confirm(
      'Keep this link alive?\n\nThe countdown goes away and the same link becomes a permanent storefront. You can still end it any time.',
    )
    if (!confirmed) return

    setConverting(true)
    try {
      const response = await fetch(`/api/manage/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'keep_alive' }),
        cache: 'no-store',
      })
      if (!response.ok) throw new Error('Keep alive failed')

      setSnapshot((await response.json()) as ManageSnapshot)
      setRefreshError(null)
    } catch {
      setRefreshError('Could not keep the link alive. Please try again.')
    } finally {
      setConverting(false)
    }
  }

  async function endDropNow() {
    const confirmed = window.confirm(
      'End this drop now?\n\nThe link stops selling immediately. Orders already paid for are unaffected.',
    )
    if (!confirmed) return

    setEnding(true)
    try {
      const response = await fetch(`/api/manage/${encodeURIComponent(token)}`, {
        method: 'POST',
        cache: 'no-store',
      })
      if (!response.ok) throw new Error('End drop failed')

      setSnapshot((await response.json()) as ManageSnapshot)
      setRefreshError(null)
    } catch {
      setRefreshError('Could not end the drop. Please try again.')
    } finally {
      setEnding(false)
    }
  }

  const paidOrders = snapshot.orders.filter((order) => order.status === 'PAID')
  const paidLateOrders = snapshot.orders.filter(
    (order) => order.status === 'PAID_LATE',
  )
  const packingItems = buildPackingList(paidOrders)
  const totalUnits = paidOrders.reduce((total, order) => total + order.qty, 0)
  const publicPath = `${siteHost()}/${snapshot.drop.seller_slug}/${snapshot.drop.drop_slug}`

  return (
    <>
      <header className="mb-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              {snapshot.drop.seller_name}
            </h1>
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              {publicPath}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={
                <Link
                  href={`/${snapshot.drop.seller_slug}/${snapshot.drop.drop_slug}`}
                />
              }
            >
              <Store />
              Walk your store
            </Button>
            {!snapshot.settled && (
              <Button
                type="button"
                size="lg"
                variant="outline"
                onClick={endDropNow}
                disabled={ending}
              >
                <Square />
                {ending ? 'Ending…' : 'End drop now'}
              </Button>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {snapshot.settled ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 font-mono text-sm text-background">
              <PackageCheck className="size-4" />
              Drop settled
            </span>
          ) : snapshot.drop.window_ends_at ? (
            <LivePill>
              <ConsoleCountdown endsAt={snapshot.drop.window_ends_at} />
            </LivePill>
          ) : (
            <LivePill>Always open</LivePill>
          )}
          <WatchingPill count={social.watching} />
          {snapshot.drop.window_ends_at ? (
            <span className="font-mono text-xs text-muted-foreground">
              closes{' '}
              {sgtDateTime.format(new Date(snapshot.drop.window_ends_at))} SGT
            </span>
          ) : (
            !snapshot.settled && (
              <span className="font-mono text-xs text-muted-foreground">
                permanent storefront — no closing time
              </span>
            )
          )}
        </div>

        {snapshot.settled && !allSoldOut(snapshot.products) && (
          <div className="mt-5 rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold">The popup can become a store</p>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
              Keep the same link selling with no countdown. Your{' '}
              <span className="font-mono">sold</span> counter keeps climbing —
              paid orders only, as always.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-3"
              onClick={keepLinkAlive}
              disabled={converting}
            >
              <Store />
              {converting ? 'Reopening…' : 'Keep this link alive'}
            </Button>
          </div>
        )}
      </header>

      {refreshError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle />
          <AlertTitle>Connection interrupted</AlertTitle>
          <AlertDescription>{refreshError}</AlertDescription>
        </Alert>
      )}

      {paidLateOrders.length > 0 && (
        <section aria-labelledby="refunds-title" className="mb-10">
          <div className="mb-3">
            <p className="font-mono text-xs tracking-widest text-alarm uppercase">
              Action required
            </p>
            <h2
              id="refunds-title"
              className="mt-1 font-display text-2xl font-semibold"
            >
              Refund {paidLateOrders.length}{' '}
              {paidLateOrders.length === 1 ? 'payment' : 'payments'}
            </h2>
          </div>

          <div className="flex flex-col gap-3">
            {paidLateOrders.map((order) => (
              <Card
                key={order.id}
                className="animate-rise bg-alarm-soft ring-alarm/25"
              >
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="font-sans text-base font-semibold">
                        {order.buyer_name} · {productLabel(order)} × {order.qty}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {order.buyer_contact} · order #{order.id.slice(0, 8)}
                      </CardDescription>
                    </div>
                    <Price amount={order.amount} className="text-base" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold text-alarm">
                    Refund this payment in the HitPay dashboard.
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/70">
                    Payment arrived after stock was exhausted. It is excluded
                    from packing and fulfilment totals.
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="stock-title" className="mb-10">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2
            id="stock-title"
            className="font-display text-2xl font-semibold"
          >
            Stock
          </h2>
          <span className="font-mono text-xs text-muted-foreground">
            paid orders only
          </span>
        </div>

        <Card className="py-1">
          <ul className="divide-y divide-border">
            {snapshot.products.map((product) => {
              const remaining = stockRemaining(product)
              return (
                <li
                  key={product.id}
                  className="flex items-center justify-between gap-4 px-5 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{product.name}</p>
                    {product.variant && (
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {product.variant}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    {product.stock_total !== null && (
                      <span className="font-mono text-xs text-muted-foreground tabular-nums">
                        {product.stock_sold}/{product.stock_total} sold
                      </span>
                    )}
                    <StockBadge
                      key={remaining ?? -product.stock_sold}
                      remaining={remaining}
                      sold={product.stock_sold}
                      className="animate-tick"
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      </section>

      {snapshot.settled && (
        <section aria-labelledby="settlement-title" className="mb-10">
          <div className="mb-4">
            <h2
              id="settlement-title"
              className="font-display text-3xl font-semibold"
            >
              Ready to fulfil
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {paidOrders.length}{' '}
              {paidOrders.length === 1 ? 'paid order' : 'paid orders'} ·{' '}
              {totalUnits} {totalUnits === 1 ? 'unit' : 'units'}. Every payment
              is already matched to an order — nothing to reconcile by hand.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <CopyList
              title="Packing list"
              description="Totals grouped by product. Paste this straight into your packing chat."
              value={packingText(snapshot, packingItems)}
            >
              {packingItems.length > 0 ? (
                <ul className="flex flex-col gap-3">
                  {packingItems.map((item) => (
                    <li
                      key={item.productId}
                      className="flex items-start justify-between gap-4"
                    >
                      <span className="leading-relaxed">{item.label}</span>
                      <span className="font-mono font-semibold tabular-nums">
                        × {item.quantity}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No paid orders to pack.
                </p>
              )}
            </CopyList>

            <CopyList
              title="Fulfilment list"
              description="Every paid buyer, contact, and delivery or pickup instruction."
              value={fulfilmentText(snapshot, paidOrders)}
            >
              {paidOrders.length > 0 ? (
                <ol className="flex flex-col gap-4">
                  {paidOrders.map((order, index) => (
                    <li key={order.id}>
                      {index > 0 && <Separator className="mb-4" />}
                      <div className="flex items-start gap-3">
                        {order.fulfilment === 'delivery' ? (
                          <Truck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold">
                            {order.buyer_name} · {productLabel(order)} ×{' '}
                            {order.qty}
                          </p>
                          <p className="mt-1 font-mono text-xs text-muted-foreground">
                            {order.buyer_contact}
                          </p>
                          <p className="mt-1 text-sm leading-relaxed text-foreground/70">
                            {orderFulfilment(order, snapshot.drop.pickup_note)}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No paid orders to fulfil.
                </p>
              )}
            </CopyList>
          </div>
        </section>
      )}

      <section aria-labelledby="orders-title" aria-live="polite">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="orders-title" className="font-display text-2xl font-semibold">
            Orders{' '}
            <span className="font-mono text-base font-normal text-muted-foreground tabular-nums">
              {snapshot.orders.length}
            </span>
          </h2>
          <span className="font-mono text-xs text-muted-foreground">
            updated{' '}
            {new Date(snapshot.refreshed_at).toLocaleTimeString('en-SG', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
              timeZone: 'Asia/Singapore',
            })}
          </span>
        </div>

        <Card className="py-0">
          {snapshot.orders.length > 0 ? (
            <>
              <div className="divide-y divide-border sm:hidden">
                {snapshot.orders.map((order, index) => (
                  <article
                    key={order.id}
                    className={
                      order.status === 'PAID_LATE'
                        ? 'bg-alarm-soft p-4'
                        : 'animate-rise p-4'
                    }
                    style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{order.buyer_name}</p>
                        <p className="mt-0.5 font-mono text-xs break-all text-muted-foreground">
                          {order.buyer_contact}
                        </p>
                      </div>
                      <StatusPill status={order.status} />
                    </div>
                    <div className="mt-4 flex items-end justify-between gap-4">
                      <div className="min-w-0">
                        <p className="leading-relaxed">
                          {productLabel(order)} × {order.qty}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground capitalize">
                          {order.fulfilment}
                        </p>
                      </div>
                      <Price amount={order.amount} className="text-base" />
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {snapshot.orders.map((order, index) => (
                      <TableRow
                        key={order.id}
                        className={
                          order.status === 'PAID_LATE'
                            ? 'bg-alarm-soft hover:bg-alarm-soft'
                            : 'animate-rise'
                        }
                        style={{
                          animationDelay: `${Math.min(index, 8) * 40}ms`,
                        }}
                      >
                        <TableCell className="min-w-40">
                          <p className="font-semibold">{order.buyer_name}</p>
                          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                            {order.buyer_contact}
                          </p>
                        </TableCell>
                        <TableCell className="min-w-52">
                          <p>{productLabel(order)}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground capitalize">
                            {order.fulfilment}
                          </p>
                        </TableCell>
                        <TableCell className="font-mono tabular-nums">
                          {order.qty}
                        </TableCell>
                        <TableCell>
                          <Price amount={order.amount} />
                        </TableCell>
                        <TableCell>
                          <StatusPill status={order.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center px-5 py-12 text-center">
              <Clock3 className="size-5 text-muted-foreground" />
              <p className="mt-3 font-semibold">No orders yet</p>
              <p className="mt-1 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Keep this page open. New checkouts will appear here
                automatically.
              </p>
            </div>
          )}
        </Card>
      </section>

      <footer className="mt-auto pt-12 text-center">
        <p className="font-mono text-xs text-muted-foreground/60">
          Order details stay behind this secret console link
        </p>
      </footer>
    </>
  )
}
