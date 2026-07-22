'use client'

import { LoaderCircle, LockKeyhole, X } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

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
import {
  isVariantSoldOut,
  variantStockRemaining,
} from '@/lib/drop-state'
import { orderTotalCents } from '@/lib/money'
import type { CustomizationGroup } from '@/lib/drop-builder'
import type { ProductVariant } from '@/lib/types'
import { cn } from '@/lib/utils'

type Fulfilment = 'pickup' | 'delivery'

export function BuyFlow({
  productId,
  productName,
  unitPrice,
  remaining,
  inventoryChoiceName,
  variants,
  customizationGroups,
  fulfilment,
  deliveryFee,
  pickupNote,
  initialOpen = false,
  onClose,
  triggerClassName,
}: {
  productId: string
  productName: string
  unitPrice: number
  /** Units left, or null when the product is uncapped (future-ideas §3). */
  remaining: number | null
  inventoryChoiceName: string | null
  variants: ProductVariant[]
  customizationGroups: CustomizationGroup[]
  fulfilment: Fulfilment | 'both'
  deliveryFee: number
  pickupNote: string | null
  initialOpen?: boolean
  onClose?: () => void
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(initialOpen)
  const [mobileCheckout, setMobileCheckout] = useState(false)
  const sortedVariants = [...variants].sort((a, b) => a.position - b.position)
  const [selectedVariantId, setSelectedVariantId] = useState(
    sortedVariants.length === 1 ? sortedVariants[0].id : '',
  )
  const [selectedCustomizations, setSelectedCustomizations] = useState<
    Record<string, string>
  >({})
  const [quantity, setQuantity] = useState(1)
  const [selectedFulfilment, setSelectedFulfilment] = useState<Fulfilment>(
    fulfilment === 'delivery' ? 'delivery' : 'pickup',
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selectedVariant = sortedVariants.find(
    (variant) => variant.id === selectedVariantId,
  )
  const effectiveRemaining = selectedVariant
    ? variantStockRemaining(selectedVariant)
    : remaining
  const effectivePrice = selectedVariant?.price ?? unitPrice
  const choicesComplete = customizationGroups.every(
    (group) => selectedCustomizations[group.name],
  )

  const totalCents = orderTotalCents({
    unitPrice: effectivePrice,
    quantity: Math.max(1, quantity || 1),
    deliveryFee,
    fulfilment: selectedFulfilment,
  })

  function closeCheckout() {
    setOpen(false)
    setMobileCheckout(false)
    setError(null)
    onClose?.()
  }

  useEffect(() => {
    if (!open) return

    const mobile = window.matchMedia('(max-width: 639px)')
    if (!mobile.matches) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !submitting) {
        setOpen(false)
        setMobileCheckout(false)
        setError(null)
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, open, submitting])

  if (remaining !== null && remaining <= 0) {
    return (
      <Button
        type="button"
        size="lg"
        className={cn('mt-4 h-12 w-full', triggerClassName)}
        disabled
      >
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
          variantId: selectedVariantId,
          customizations: selectedCustomizations,
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
        className={cn('mt-4 h-12 w-full', triggerClassName)}
        aria-label={`Buy ${productName}`}
        onClick={() => {
          setMobileCheckout(window.matchMedia('(max-width: 639px)').matches)
          setOpen(true)
        }}
      >
        {sortedVariants.length > 1 || customizationGroups.length
          ? 'Buy'
          : 'Buy'}
      </Button>
    )
  }

  const checkoutForm = (
    <form
      className="fixed inset-0 z-[100] overflow-y-auto bg-background px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:static sm:z-auto sm:mt-4 sm:overflow-visible sm:border-t sm:border-border sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-4"
      onSubmit={handleSubmit}
      aria-label={`Checkout for ${productName}`}
      aria-modal={mobileCheckout || undefined}
      role={mobileCheckout ? 'dialog' : undefined}
    >
      <div className="sticky top-0 z-10 -mx-5 mb-5 flex items-center justify-between border-b border-border bg-background/95 px-5 py-4 backdrop-blur sm:hidden">
        <div className="min-w-0 pr-4">
          <p className="font-display text-xl font-semibold">Checkout</p>
          <p className="truncate text-sm text-muted-foreground">
            {productName} · {sgd.format(effectivePrice)}
          </p>
        </div>
        <button
          type="button"
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Close checkout"
          onClick={closeCheckout}
          disabled={submitting}
        >
          <X className="size-5" />
        </button>
      </div>
      {sortedVariants.length > 1 && (
        <fieldset className="mb-4">
          <legend className="text-sm font-medium">
            Choose {inventoryChoiceName?.toLowerCase() || 'an option'}
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {sortedVariants.map((variant) => {
              const soldOut = isVariantSoldOut(variant)
              const selected = variant.id === selectedVariantId
              return (
                <button
                  key={variant.id}
                  type="button"
                  disabled={soldOut}
                  aria-pressed={selected}
                  onClick={() => {
                    setSelectedVariantId(variant.id)
                    setQuantity(1)
                  }}
                  className={cn(
                    'min-h-11 min-w-12 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                    selected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background hover:border-foreground/40',
                    soldOut && 'cursor-not-allowed opacity-40 line-through',
                  )}
                >
                  {variant.label}
                </button>
              )
            })}
          </div>
          {selectedVariant && selectedVariant.price !== unitPrice && (
            <p className="mt-2 text-xs text-muted-foreground">
              {sgd.format(selectedVariant.price)} for this option
            </p>
          )}
        </fieldset>
      )}

      {customizationGroups.map((group) => (
        <fieldset key={group.name} className="mb-4">
          <legend className="text-sm font-medium">{group.name}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {group.values.map((value) => {
              const selected = selectedCustomizations[group.name] === value
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    setSelectedCustomizations((current) => ({
                      ...current,
                      [group.name]: value,
                    }))
                  }
                  className={cn(
                    'min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                    selected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background hover:border-foreground/40',
                  )}
                >
                  {value}
                </button>
              )
            })}
          </div>
        </fieldset>
      ))}

      <div className={fulfilment === 'both' ? 'grid grid-cols-2 gap-3' : ''}>
        <div className="space-y-1.5">
          <Label htmlFor={`quantity-${productId}`}>How many</Label>
          <Input
            id={`quantity-${productId}`}
            name="quantity"
            type="number"
            inputMode="numeric"
            min={1}
            max={effectiveRemaining ?? undefined}
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
            required
            className="h-11 sm:h-8"
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
          className="h-11 sm:h-8"
        />
      </div>

      <div className="mt-3 space-y-1.5">
        <Label htmlFor={`contact-${productId}`}>Phone or email</Label>
        <Input
          id={`contact-${productId}`}
          name="buyerContact"
          maxLength={200}
          required
          className="h-11 sm:h-8"
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
            className="h-11 sm:h-8"
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
            {selectedVariant?.label ? ` · ${selectedVariant.label}` : ''}
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
        disabled={
          submitting || quantity < 1 || (remaining !== null && quantity > remaining)
          || !selectedVariantId
          || !choicesComplete
          || (effectiveRemaining !== null && quantity > effectiveRemaining)
        }
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
        onClick={closeCheckout}
        disabled={submitting}
      >
        Cancel
      </button>
    </form>
  )

  return mobileCheckout ? createPortal(checkoutForm, document.body) : checkoutForm
}
