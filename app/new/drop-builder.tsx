'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  ImagePlus,
  LoaderCircle,
  Maximize2,
  Pencil,
  Plus,
  Share2,
  Sparkles,
  X,
} from 'lucide-react'
import { DragEvent, FormEvent, useEffect, useMemo, useState } from 'react'

import { DraftItemCard, type ProductDraft } from '@/components/ds/draft-item-card'
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
import { siteHost, slugify } from '@/lib/format'

type Fulfilment = 'pickup' | 'delivery' | 'both'
type Phase = 'upload' | 'review' | 'success'

type PublishedDrop = {
  buyerUrl: string
  manageUrl: string
  qrDataUrl: string
  sellerSlug: string
  dropSlug: string
}

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024
const MAX_IMAGE_COUNT = 5
const COMPRESSION_THRESHOLD_BYTES = 3 * 1024 * 1024

const WINDOW_PRESETS = [
  { hours: 2, label: '2 hours' },
  { hours: 6, label: '6 hours' },
  { hours: 24, label: '24 hours' },
] as const

const FULFILMENT_LABELS: Record<Fulfilment, string> = {
  pickup: 'Pickup only',
  delivery: 'Delivery only',
  both: 'Buyer chooses',
}

const closingTime = new Intl.DateTimeFormat('en-SG', {
  weekday: 'short',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

type SelectedImage = {
  id: string
  file: File
}

function newProduct(product?: {
  name: string
  variant: string | null
  price: number
}): ProductDraft {
  return {
    id: crypto.randomUUID(),
    name: product?.name ?? '',
    variant: product?.variant ?? '',
    price: product ? String(product.price) : '',
    stock: '10',
    imageUrl: null,
    imageSource: null,
  }
}

function localDateTimeValue(date: Date) {
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localTime.toISOString().slice(0, 16)
}

function hoursFromNow(hours: number) {
  return localDateTimeValue(new Date(Date.now() + hours * 60 * 60 * 1000))
}

async function prepareImage(file: File, maxBytes = MAX_UPLOAD_BYTES) {
  if (file.size <= Math.min(COMPRESSION_THRESHOLD_BYTES, maxBytes)) return file

  try {
    const bitmap = await createImageBitmap(file)
    let scale = Math.min(
      1,
      1600 / Math.max(bitmap.width, bitmap.height),
      Math.sqrt(maxBytes / file.size) * 0.95,
    )
    const canvas = document.createElement('canvas')

    for (const quality of [0.82, 0.7, 0.58]) {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      canvas
        .getContext('2d')
        ?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

      const compressed = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', quality),
      )

      if (compressed && compressed.size <= maxBytes) {
        bitmap.close()
        return compressed
      }

      scale *= 0.82
    }

    bitmap.close()
  } catch {
    // The original file may still fit the request limit; validate it below.
  }

  if (file.size <= maxBytes) return file
  throw new Error('That photo is too large. Try one under 4 MB.')
}

function CopyButton({
  value,
  label,
  variant = 'outline',
  className,
}: {
  value: string
  label: string
  variant?: 'outline' | 'secondary'
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <Button type="button" variant={variant} className={className} onClick={copy}>
      {copied ? <Check /> : <Copy />}
      {copied ? 'Copied' : label}
    </Button>
  )
}

export function DropBuilder() {
  const host = siteHost()
  const [phase, setPhase] = useState<Phase>('upload')
  const [sellerName, setSellerName] = useState('')
  const [dropSlug, setDropSlug] = useState('tonight')
  const [editingSlug, setEditingSlug] = useState(false)
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [products, setProducts] = useState<ProductDraft[]>([])
  const [windowEndsAt, setWindowEndsAt] = useState(() => hoursFromNow(2))
  const [windowPreset, setWindowPreset] = useState<number | null>(2)
  const [fulfilment, setFulfilment] = useState<Fulfilment>('pickup')
  const [deliveryFee, setDeliveryFee] = useState('5')
  const [pickupNote, setPickupNote] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [published, setPublished] = useState<PublishedDrop | null>(null)
  const [projectingQr, setProjectingQr] = useState(false)
  const [busyProductIds, setBusyProductIds] = useState<string[]>([])
  const [productShotErrors, setProductShotErrors] = useState<
    Record<string, string>
  >({})

  const sellerSlug = slugify(sellerName, 'your-name')
  const cleanDropSlug = slugify(dropSlug, 'tonight')

  const imagePreviews = useMemo(
    () =>
      selectedImages.map((image) => ({
        ...image,
        url: URL.createObjectURL(image.file),
      })),
    [selectedImages],
  )

  useEffect(
    () => () => {
      imagePreviews.forEach((image) => URL.revokeObjectURL(image.url))
    },
    [imagePreviews],
  )

  useEffect(() => {
    if (!projectingQr) return

    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProjectingQr(false)
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [projectingQr])

  function updateProduct(updated: ProductDraft) {
    setProducts((current) =>
      current.map((product) =>
        product.id === updated.id ? updated : product,
      ),
    )
  }

  function addImages(files: File[]) {
    const images = files.filter((file) => file.type.startsWith('image/'))
    const existing = new Set(
      selectedImages.map(
        ({ file }) => `${file.name}:${file.size}:${file.lastModified}`,
      ),
    )
    const uniqueImages = images.filter(
      (file) => !existing.has(`${file.name}:${file.size}:${file.lastModified}`),
    )
    const availableSlots = MAX_IMAGE_COUNT - selectedImages.length
    const additions = uniqueImages.slice(0, availableSlots)

    if (images.length !== files.length) {
      setError('Only image files can be added.')
    } else if (uniqueImages.length > availableSlots) {
      setError(`You can use up to ${MAX_IMAGE_COUNT} photos.`)
    } else {
      setError(null)
    }

    if (!additions.length) return

    setSelectedImages((current) => [
      ...current,
      ...additions.map((file) => ({ id: crypto.randomUUID(), file })),
    ])
  }

  function dropImages(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setDragActive(false)
    addImages(Array.from(event.dataTransfer.files))
  }

  function updateProductImage(
    productId: string,
    imageUrl: string,
    imageSource: ProductDraft['imageSource'],
  ) {
    setProducts((current) =>
      current.map((product) =>
        product.id === productId
          ? { ...product, imageUrl, imageSource }
          : product,
      ),
    )
  }

  function setProductShotBusy(productId: string, busy: boolean) {
    setBusyProductIds((current) =>
      busy
        ? current.includes(productId)
          ? current
          : [...current, productId]
        : current.filter((id) => id !== productId),
    )
  }

  function setProductShotError(productId: string, message?: string) {
    setProductShotErrors((current) => {
      const next = { ...current }
      if (message) next[productId] = message
      else delete next[productId]
      return next
    })
  }

  async function uploadProductShot(product: ProductDraft, image: File) {
    setProductShotBusy(product.id, true)
    setProductShotError(product.id)

    try {
      const prepared = await prepareImage(image)
      const formData = new FormData()
      formData.set('mode', 'upload')
      formData.set('image', prepared, image.name)

      const response = await fetch('/api/product-shots', {
        method: 'POST',
        body: formData,
      })
      const result = (await response.json()) as {
        imageUrl?: string
        error?: string
      }
      if (!response.ok || !result.imageUrl) {
        throw new Error(result.error || 'That photo could not be saved.')
      }

      updateProductImage(product.id, result.imageUrl, 'uploaded')
    } catch (caught) {
      setProductShotError(
        product.id,
        caught instanceof Error ? caught.message : 'That photo could not be saved.',
      )
    } finally {
      setProductShotBusy(product.id, false)
    }
  }

  async function improveProductShot(product: ProductDraft) {
    setProductShotBusy(product.id, true)
    setProductShotError(product.id)

    try {
      const formData = new FormData()
      formData.set('name', product.name)
      formData.set('variant', product.variant)

      if (product.imageUrl) {
        formData.set('referenceUrl', product.imageUrl)
      } else if (
        selectedImages[0] &&
        ['image/jpeg', 'image/png', 'image/webp'].includes(
          selectedImages[0].file.type,
        )
      ) {
        const referenceImage = selectedImages[0].file
        const prepared = await prepareImage(referenceImage)
        formData.set('image', prepared, referenceImage.name)
      }

      const response = await fetch('/api/product-shots', {
        method: 'POST',
        body: formData,
      })
      const result = (await response.json()) as {
        imageUrl?: string
        error?: string
      }
      if (!response.ok || !result.imageUrl) {
        throw new Error(result.error || 'That photo could not be generated.')
      }

      updateProductImage(product.id, result.imageUrl, 'generated')
    } catch (caught) {
      setProductShotError(
        product.id,
        caught instanceof Error
          ? caught.message
          : 'That photo could not be generated.',
      )
    } finally {
      setProductShotBusy(product.id, false)
    }
  }

  async function shareBuyerLink() {
    if (!published) return

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${sellerName}'s drop`,
          url: published.buyerUrl,
        })
      } else {
        await navigator.clipboard.writeText(published.buyerUrl)
      }
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return
      console.error('Could not share buyer link', caught)
    }
  }

  async function extract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedImages.length) return

    setExtracting(true)
    setError(null)

    try {
      const maxBytesPerImage = Math.floor(
        MAX_UPLOAD_BYTES / selectedImages.length,
      )
      const images = await Promise.all(
        selectedImages.map(({ file }) =>
          prepareImage(file, maxBytesPerImage),
        ),
      )
      const formData = new FormData()
      images.forEach((image, index) => {
        formData.append('images', image, `menu-${index + 1}.jpg`)
      })

      const response = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      })
      const result = (await response.json()) as {
        products?: Array<{
          name: string
          variant: string | null
          price: number
        }>
        error?: string
      }

      if (!response.ok || !result.products?.length) {
        throw new Error(
          result.error ||
            'We could not find any items with prices in those photos. Try a clearer photo, or add items by hand.',
        )
      }

      setProducts(result.products.map((product) => newProduct(product)))
      setPhase('review')
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'We could not read those photos. Try again, or add items by hand.',
      )
    } finally {
      setExtracting(false)
    }
  }

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPublishing(true)
    setError(null)

    try {
      const response = await fetch('/api/drops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerName,
          dropSlug,
          products: products.map((product) => ({
            name: product.name,
            variant: product.variant.trim() || null,
            price: Number(product.price),
            stock: Number(product.stock),
            imageUrl: product.imageUrl,
          })),
          windowEndsAt: new Date(windowEndsAt).toISOString(),
          fulfilment,
          deliveryFee: fulfilment === 'pickup' ? 0 : Number(deliveryFee),
          pickupNote:
            fulfilment === 'delivery' ? null : pickupNote.trim() || null,
        }),
      })
      const result = (await response.json()) as PublishedDrop & {
        error?: string
      }

      if (!response.ok || !result.buyerUrl) {
        throw new Error(result.error || 'The drop could not be published.')
      }

      setPublished(result)
      setPhase('success')
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'The drop could not be published. Please try again.',
      )
    } finally {
      setPublishing(false)
    }
  }

  if (phase === 'success' && published) {
    // Show the host the seller will actually share, not a hardcoded one.
    const publishedHost = (() => {
      try {
        return new URL(published.buyerUrl).host
      } catch {
        return host
      }
    })()
    const managePath = (() => {
      try {
        return new URL(published.manageUrl).pathname
      } catch {
        return published.manageUrl
      }
    })()

    return (
      <section className="animate-rise flex flex-1 flex-col">
        {projectingQr && (
          <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background p-5"
            role="dialog"
            aria-modal="true"
            aria-label="Buyer QR code, full screen"
          >
            <Button
              type="button"
              variant="outline"
              className="absolute top-5 right-5"
              onClick={() => setProjectingQr(false)}
            >
              <X />
              Close
            </Button>
            <p className="font-mono text-sm tracking-widest text-live uppercase">
              Scan to buy
            </p>
            <div className="mt-5 w-[min(76vh,82vw)] max-w-3xl rounded-3xl bg-white p-4 shadow-lg">
              <Image
                src={published.qrDataUrl}
                alt={`QR code for ${published.buyerUrl}`}
                width={960}
                height={960}
                className="size-full"
                unoptimized
                priority
              />
            </div>
            <p className="mt-5 max-w-[90vw] font-mono text-xl break-all sm:text-3xl">
              {publishedHost}/{published.sellerSlug}/
              <span className="text-primary">{published.dropSlug}</span>
            </p>
          </div>
        )}

        <header className="text-center">
          <p className="font-mono text-xs tracking-widest text-live uppercase">
            Live now
          </p>
          <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight text-balance">
            Your drop is live.
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Send the link, or put the QR on screen.
          </p>
        </header>

        <div className="mt-8 rounded-2xl border border-border bg-card p-5 text-center shadow-sm">
          <div className="mx-auto w-full max-w-72 rounded-xl bg-white p-3">
            <Image
              src={published.qrDataUrl}
              alt={`QR code for ${published.buyerUrl}`}
              width={640}
              height={640}
              unoptimized
              priority
            />
          </div>
          <p className="mt-5 font-mono text-xs break-all sm:text-sm">
            {publishedHost}/{published.sellerSlug}/
            <span className="text-primary">{published.dropSlug}</span>
          </p>
          <Button
            type="button"
            size="lg"
            className="mt-4 h-12 w-full"
            onClick={shareBuyerLink}
          >
            <Share2 />
            Share link
          </Button>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <CopyButton value={published.buyerUrl} label="Copy link" />
            <Button
              type="button"
              variant="outline"
              onClick={() => setProjectingQr(true)}
            >
              <Maximize2 />
              Full-screen QR
            </Button>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-muted p-4">
          <p className="text-sm font-semibold">Your orders live here</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Save this link — it&rsquo;s the only way back to your orders, and
            anyone who has it can manage your drop.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              nativeButton={false}
              render={<Link href={managePath} />}
            >
              Open console
            </Button>
            <CopyButton value={published.manageUrl} label="Copy" />
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2">
          <Button
            size="lg"
            variant="outline"
            className="h-12 w-full"
            nativeButton={false}
            render={
              <Link href={`/${published.sellerSlug}/${published.dropSlug}`} />
            }
          >
            See what buyers see
            <ArrowRight />
          </Button>
          <Button
            size="lg"
            variant="ghost"
            nativeButton={false}
            render={<Link href="/new" />}
          >
            Create another drop
          </Button>
        </div>
      </section>
    )
  }

  if (phase === 'review') {
    const closesAt = new Date(windowEndsAt)
    const closesLabel = Number.isNaN(closesAt.getTime())
      ? 'Pick a closing time'
      : `Closes ${closingTime.format(closesAt)}`

    return (
      <form className="flex flex-1 flex-col" onSubmit={publish}>
        <header>
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => {
              setPhase('upload')
              setError(null)
            }}
          >
            <ArrowLeft className="size-4" />
            Back to photos
          </button>
          <p className="mt-7 font-mono text-xs break-all text-muted-foreground">
            {host}/{sellerSlug}/
            <span className="text-primary">{cleanDropSlug}</span>
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
            Check the draft.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {selectedImages.length
              ? `We read ${products.length} ${products.length === 1 ? 'item' : 'items'} from your photos. Fix anything wrong — this is what buyers will see.`
              : 'Add each item, price and how many you have. This is what buyers will see.'}
          </p>
        </header>

        <section className="mt-8 space-y-3">
          {products.map((product) => (
            <DraftItemCard
              key={product.id}
              product={product}
              canRemove={products.length > 1}
              busy={busyProductIds.includes(product.id)}
              error={productShotErrors[product.id]}
              onChange={updateProduct}
              onRemove={() =>
                setProducts((current) =>
                  current.filter((item) => item.id !== product.id),
                )
              }
              onUpload={uploadProductShot}
              onImprove={improveProductShot}
            />
          ))}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setProducts((current) => [...current, newProduct()])}
          >
            <Plus />
            Add an item
          </Button>
        </section>

        <section className="mt-9 border-t border-border pt-8">
          <h2 className="font-display text-2xl font-semibold">Selling window</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Buyers see a countdown. The link stops selling when it hits zero.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {WINDOW_PRESETS.map((preset) => (
              <Button
                key={preset.hours}
                type="button"
                variant={windowPreset === preset.hours ? 'default' : 'outline'}
                aria-pressed={windowPreset === preset.hours}
                onClick={() => {
                  setWindowPreset(preset.hours)
                  setWindowEndsAt(hoursFromNow(preset.hours))
                }}
              >
                {preset.label}
              </Button>
            ))}
            <Button
              type="button"
              variant={windowPreset === null ? 'default' : 'outline'}
              aria-pressed={windowPreset === null}
              onClick={() => setWindowPreset(null)}
            >
              <Pencil />
              Pick a time
            </Button>
          </div>

          {windowPreset === null ? (
            <div className="mt-3 space-y-1.5">
              <Label htmlFor="window-end">Closing time</Label>
              <Input
                id="window-end"
                className="font-mono tabular-nums"
                type="datetime-local"
                value={windowEndsAt}
                min={localDateTimeValue(new Date())}
                required
                onChange={(event) => setWindowEndsAt(event.target.value)}
              />
            </div>
          ) : (
            <p className="mt-3 font-mono text-sm text-muted-foreground tabular-nums">
              {closesLabel}
            </p>
          )}
        </section>

        <section className="mt-9 border-t border-border pt-8">
          <h2 className="font-display text-2xl font-semibold">
            How buyers get it
          </h2>

          <div className="mt-4 space-y-1.5">
            <Label htmlFor="fulfilment">Pickup or delivery</Label>
            <Select
              value={fulfilment}
              onValueChange={(value) => setFulfilment(value as Fulfilment)}
            >
              <SelectTrigger id="fulfilment" className="w-full">
                <SelectValue>
                  {(value: Fulfilment) => FULFILMENT_LABELS[value]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pickup">
                  {FULFILMENT_LABELS.pickup}
                </SelectItem>
                <SelectItem value="delivery">
                  {FULFILMENT_LABELS.delivery}
                </SelectItem>
                <SelectItem value="both">{FULFILMENT_LABELS.both}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(fulfilment === 'delivery' || fulfilment === 'both') && (
            <div className="mt-3 space-y-1.5">
              <Label htmlFor="delivery-fee">Delivery fee (S$)</Label>
              <Input
                id="delivery-fee"
                className="font-mono tabular-nums"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={deliveryFee}
                required
                onChange={(event) => setDeliveryFee(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Added to the buyer&rsquo;s total at checkout.
              </p>
            </div>
          )}

          {(fulfilment === 'pickup' || fulfilment === 'both') && (
            <div className="mt-3 space-y-1.5">
              <Label htmlFor="pickup-note">
                Pickup details{' '}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="pickup-note"
                value={pickupNote}
                maxLength={240}
                placeholder="e.g. Hougang, exact address after payment"
                onChange={(event) => setPickupNote(event.target.value)}
              />
            </div>
          )}
        </section>

        <div className="sticky bottom-0 -mx-5 -mb-16 mt-9 border-t border-border bg-background/85 px-5 pt-3 pb-6 backdrop-blur">
          {error && (
            <p className="mb-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            className="h-12 w-full"
            disabled={publishing || busyProductIds.length > 0}
          >
            {publishing ? (
              <>
                <LoaderCircle className="animate-spin" />
                Publishing…
              </>
            ) : (
              <>
                Publish drop
                <ArrowRight />
              </>
            )}
          </Button>
          <p className="mt-2 text-center font-mono text-xs text-muted-foreground tabular-nums">
            {products.length} {products.length === 1 ? 'item' : 'items'} ·{' '}
            {closesLabel}
          </p>
        </div>
      </form>
    )
  }

  return (
    <form className="flex flex-1 flex-col" onSubmit={extract}>
      <header>
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Step 1 of 2
        </p>
        <h1 className="mt-3 font-display text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl">
          Turn a photo into a storefront.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Upload the menu photos you already send customers. We&rsquo;ll read
          the items and prices — you check them next.
        </p>
      </header>

      <section className="mt-8 space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <Label htmlFor="menu-photo">Your photos</Label>
            <span className="font-mono text-[11px] text-muted-foreground">
              {selectedImages.length}/{MAX_IMAGE_COUNT}
            </span>
          </div>
          <input
            id="menu-photo"
            className="sr-only"
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => {
              addImages(Array.from(event.target.files ?? []))
              event.currentTarget.value = ''
            }}
          />
          <label
            htmlFor="menu-photo"
            className={`group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed bg-card text-center transition-all hover:border-primary/50 focus-within:border-ring ${
              selectedImages.length ? 'min-h-28' : 'min-h-52'
            } ${
              dragActive
                ? 'border-primary bg-accent/60 ring-3 ring-primary/15'
                : 'border-border'
            }`}
            onDragEnter={(event) => {
              event.preventDefault()
              setDragActive(true)
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                setDragActive(false)
              }
            }}
            onDrop={dropImages}
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-accent text-primary transition-transform group-hover:scale-105">
              <ImagePlus className="size-5" />
            </span>
            <span className="mt-3 text-sm font-semibold">
              {dragActive
                ? 'Drop them here'
                : selectedImages.length
                  ? 'Add another photo'
                  : 'Choose photos'}
            </span>
            <span className="mt-1 max-w-64 text-xs leading-relaxed text-muted-foreground">
              Menu cards, price lists or product shots. Up to {MAX_IMAGE_COUNT}.
            </span>
          </label>

          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-2 pt-1">
              {imagePreviews.map((image, index) => (
                <div
                  key={image.id}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted"
                >
                  <Image
                    src={image.url}
                    alt={`Photo ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 448px) 33vw, 144px"
                    unoptimized
                  />
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="secondary"
                    className="absolute top-1.5 right-1.5 rounded-full bg-background/90 shadow-sm backdrop-blur-sm"
                    aria-label={`Remove photo ${index + 1}`}
                    onClick={() => {
                      setSelectedImages((current) =>
                        current.filter((item) => item.id !== image.id),
                      )
                      setError(null)
                    }}
                  >
                    <X />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="seller-name">Your selling name</Label>
          <Input
            id="seller-name"
            value={sellerName}
            autoComplete="organization"
            maxLength={80}
            placeholder="e.g. Roti Wife"
            required
            onChange={(event) => setSellerName(event.target.value)}
          />
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5">
            <p className="font-mono text-xs text-muted-foreground">
              {host}/{sellerSlug}/
              <span className="text-primary">{cleanDropSlug}</span>
            </p>
            {!editingSlug && (
              <button
                type="button"
                className="text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
                onClick={() => setEditingSlug(true)}
              >
                Edit link
              </button>
            )}
          </div>
        </div>

        {editingSlug && (
          <div className="space-y-1.5">
            <Label htmlFor="drop-slug">Link ending</Label>
            <Input
              id="drop-slug"
              className="font-mono"
              value={dropSlug}
              maxLength={64}
              placeholder="tonight"
              required
              onChange={(event) => setDropSlug(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Name this drop: tonight, weekend-bake, live-sale.
            </p>
          </div>
        )}
      </section>

      {error && (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="mt-6 h-12 w-full"
        disabled={!selectedImages.length || extracting}
      >
        {extracting ? (
          <>
            <LoaderCircle className="animate-spin" />
            Reading your photos…
          </>
        ) : (
          <>
            <Sparkles />
            Read my photos
          </>
        )}
      </Button>
      <Button
        type="button"
        size="lg"
        variant="ghost"
        className="mt-1 w-full"
        disabled={!sellerName.trim()}
        onClick={() => {
          setProducts([newProduct()])
          setPhase('review')
          setError(null)
        }}
      >
        Add items by hand instead
      </Button>
    </form>
  )
}
