'use client'

import { LoaderCircle, LockKeyhole } from 'lucide-react'
import { FormEvent, useMemo, useState } from 'react'

import { Price } from '@/components/ds/price'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { sgd } from '@/lib/format'
import { orderTotalCents } from '@/lib/money'

type Fulfilment = 'pickup' | 'delivery'

export function BuyFlow({
  productId,
  productName,
  unitPrice,
  remaining,
  fulfilment,
  deliveryFee,
  pickupNote,
}: {
  productId: string
  productName: string
  unitPrice: number
  remaining: number
  fulfilment: Fulfilment | 'both'
  deliveryFee: number
  pickupNote: string | null
}) {
  const [open, setOpen] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [selectedFulfilment, setSelectedFulfilment] = useState<Fulfilment>(
    fulfilment === 'delivery' ? 'delivery' : 'pickup',
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalCents = useMemo(
    () =>
      orderTotalCents({
        unitPrice,
        quantity: Math.max(1, quantity || 1),
        deliveryFee,
        fulfilment: selectedFulfilment,
      }),
    [deliveryFee, quantity, selectedFulfilment, unitPrice],
  )

  if (remaining <= 0) {
    return (
      <Button type="button" size="lg" className="mt-4 h-12 w-full" disabled>
        Sold out
      </Button>
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          quantity,
          buyerName: form.get('buyerName'),
          buyerContact: form.get('buyerContact'),
          fulfilment: selectedFulfilment,
          address:
            selectedFulfilment === 'delivery' ? form.get('address') : null,
        }),
      })

      const result = (await response.json()) as {
        checkoutUrl?: string
        error?: string
      }

      if (!response.ok || !result.checkoutUrl) {
        throw new Error(result.error ?? 'Could not start checkout')
      }

      window.location.assign(result.checkoutUrl)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Could not start checkout. Please try again.',
      )
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        size="lg"
        className="mt-4 h-12 w-full"
        aria-label={`Buy ${productName}`}
        onClick={() => setOpen(true)}
      >
        Buy
      </Button>
    )
  }

  return (
    <form className="mt-4 border-t border-border pt-4" onSubmit={handleSubmit}>
      <div className={fulfilment === 'both' ? 'grid grid-cols-2 gap-3' : ''}>
        <div className="space-y-1.5">
          <Label htmlFor={`quantity-${productId}`}>How many</Label>
          <Input
            id={`quantity-${productId}`}
            name="quantity"
            type="number"
            inputMode="numeric"
            min={1}
            max={remaining}
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
            required
          />
        </div>

        {fulfilment === 'both' && (
          <div className="space-y-1.5">
            <Label htmlFor={`fulfilment-${productId}`}>Pickup or delivery</Label>
            <Select
              value={selectedFulfilment}
              onValueChange={(value) => setSelectedFulfilment(value as Fulfilment)}
            >
              <SelectTrigger
                id={`fulfilment-${productId}`}
                className="h-8 w-full"
              >
                <SelectValue>
                  {(value: Fulfilment) =>
                    value === 'delivery' ? 'Delivery' : 'Pickup'
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pickup">Pickup</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="mt-3 space-y-1.5">
        <Label htmlFor={`name-${productId}`}>Your name</Label>
        <Input
          id={`name-${productId}`}
          name="buyerName"
          autoComplete="name"
          maxLength={120}
          required
        />
      </div>

      <div className="mt-3 space-y-1.5">
        <Label htmlFor={`contact-${productId}`}>Phone or email</Label>
        <Input
          id={`contact-${productId}`}
          name="buyerContact"
          maxLength={200}
          required
        />
      </div>

      {selectedFulfilment === 'delivery' ? (
        <div className="mt-3 space-y-1.5">
          <Label htmlFor={`address-${productId}`}>Delivery address</Label>
          <Input
            id={`address-${productId}`}
            name="address"
            autoComplete="street-address"
            maxLength={500}
            required
          />
        </div>
      ) : (
        pickupNote && (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Pickup: {pickupNote}
          </p>
        )
      )}

      <div className="mt-4 flex items-center justify-between rounded-xl bg-muted px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Total</p>
          <p className="truncate text-xs text-muted-foreground">
            {quantity || 1} × {productName}
            {selectedFulfilment === 'delivery'
              ? ` + ${sgd.format(deliveryFee)} delivery`
              : ''}
          </p>
        </div>
        <Price amount={totalCents / 100} className="text-base" />
      </div>

      {error && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="mt-4 h-12 w-full"
        disabled={submitting || quantity < 1 || quantity > remaining}
      >
        {submitting ? (
          <>
            <LoaderCircle className="animate-spin" />
            Opening checkout…
          </>
        ) : (
          <>
            <LockKeyhole />
            Continue to payment
          </>
        )}
      </Button>
      <p className="mt-2 text-center text-xs leading-relaxed text-muted-foreground">
        You&rsquo;ll pay on HitPay — PayNow, card or GrabPay. Your order is
        confirmed once payment clears.
      </p>
      <button
        type="button"
        className="mt-2 w-full py-1 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => {
          setOpen(false)
          setError(null)
        }}
        disabled={submitting}
      >
        Cancel
      </button>
    </form>
  )
}
