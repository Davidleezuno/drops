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
  LockKeyhole,
  Maximize2,
  Plus,
  Share2,
  Sparkles,
  X,
} from 'lucide-react'
import { DragEvent, FormEvent, useEffect, useMemo, useState } from 'react'

import {
  ExtractedProductRow,
  type ProductDraft,
} from '@/components/ds/extracted-product-row'
import { StorefrontDraftPreview } from '@/components/ds/storefront-draft-preview'
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
  throw new Error('One of those photos is too large to prepare. Try a smaller image.')
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <Button type="button" variant="outline" onClick={copy}>
      {copied ? <Check /> : <Copy />}
      {copied ? 'Copied' : label}
    </Button>
  )
}

export function DropBuilder() {
  const [phase, setPhase] = useState<Phase>('upload')
  const [sellerName, setSellerName] = useState('')
  const [dropSlug, setDropSlug] = useState('tonight')
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [products, setProducts] = useState<ProductDraft[]>([])
  const [windowEndsAt, setWindowEndsAt] = useState(() =>
    localDateTimeValue(new Date(Date.now() + 2 * 60 * 60 * 1000)),
  )
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
      setError(`Add up to ${MAX_IMAGE_COUNT} photos at a time.`)
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
        throw new Error(result.error || 'That product shot could not be improved.')
      }

      updateProductImage(product.id, result.imageUrl, 'generated')
    } catch (caught) {
      setProductShotError(
        product.id,
        caught instanceof Error
          ? caught.message
          : 'That product shot could not be improved.',
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
        throw new Error(result.error || 'No products were found in that image.')
      }

      setProducts(result.products.map((product) => newProduct(product)))
      setPhase('review')
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'We could not read that image. Please try again.',
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
    return (
      <section className="animate-rise flex flex-1 flex-col">
        {projectingQr && (
          <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background p-5"
            role="dialog"
            aria-modal="true"
            aria-label="Project buyer QR code"
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
              Scan to join the drop
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
              drops.sg/{published.sellerSlug}/
              <span className="text-primary">{published.dropSlug}</span>
            </p>
          </div>
        )}

        <header className="text-center">
          <p className="font-mono text-xs tracking-widest text-live uppercase">
            Your drop is live
          </p>
          <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight text-balance">
            Ready to share.
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Put this QR on screen or send the link wherever your people are.
          </p>
        </header>

        <div className="mt-8 rounded-2xl border border-border bg-card p-5 text-center shadow-sm">
          <div className="mx-auto w-full max-w-80 rounded-xl bg-white p-3">
            <Image
              src={published.qrDataUrl}
              alt={`QR code for ${published.buyerUrl}`}
              width={640}
              height={640}
              unoptimized
              priority
            />
          </div>
          <p className="mt-5 font-mono text-sm break-all">
            drops.sg/{published.sellerSlug}/
            <span className="text-primary">{published.dropSlug}</span>
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <CopyButton value={published.buyerUrl} label="Copy buyer link" />
            <Button
              type="button"
              variant="outline"
              onClick={() => setProjectingQr(true)}
            >
              <Maximize2 />
              Project QR
            </Button>
            <Button
              type="button"
              onClick={shareBuyerLink}
            >
              <Share2 />
              Share
            </Button>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-muted p-4">
          <div className="flex items-start gap-3">
            <LockKeyhole className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Seller console</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Keep this private. Anyone with this link can manage and settle
                your drop.
              </p>
              <p className="mt-3 truncate font-mono text-xs text-muted-foreground">
                {published.manageUrl}
              </p>
              <div className="mt-3">
                <CopyButton
                  value={published.manageUrl}
                  label="Copy private link"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2">
          <Button
            size="lg"
            className="w-full"
            render={<Link href={`/${published.sellerSlug}/${published.dropSlug}`} />}
          >
            Open storefront
            <ArrowRight />
          </Button>
          <Button size="lg" variant="ghost" render={<Link href="/new" />}>
            Create another drop
          </Button>
        </div>
      </section>
    )
  }

  if (phase === 'review') {
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
            Change photo
          </button>
          <p className="mt-7 font-mono text-xs text-muted-foreground">
            drops.sg/{sellerName.toLowerCase().replace(/\s+/g, '-')}/
            <span className="text-primary">{dropSlug}</span>
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
            AI drafted it. You confirm it.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Fix anything we misread, then make three decisions before you go
            live.
          </p>
        </header>

        <section className="mt-9">
          <div className="mb-4">
            <p className="font-mono text-xs tracking-widest text-primary uppercase">
              1 · Preview
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold">
              See what buyers will see
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Product photos are optional. Add your own or use AI to turn a rough
              reference into a clean storefront shot.
            </p>
          </div>
          <StorefrontDraftPreview
            sellerName={sellerName}
            dropSlug={dropSlug}
            products={products}
            busyProductIds={busyProductIds}
            errors={productShotErrors}
            onImprove={improveProductShot}
            onUpload={uploadProductShot}
          />
        </section>

        <section className="mt-9 border-t border-border pt-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs tracking-widest text-primary uppercase">
                2 · Stock
              </p>
              <h2 className="mt-1 font-display text-2xl font-semibold">
                What&rsquo;s available
              </h2>
            </div>
            <p className="text-right text-xs text-muted-foreground">
              {products.length} {products.length === 1 ? 'item' : 'items'}
            </p>
          </div>

          <div className="space-y-3">
            {products.map((product, index) => (
              <ExtractedProductRow
                key={product.id}
                index={index}
                product={product}
                canRemove={products.length > 1}
                onChange={updateProduct}
                onRemove={() =>
                  setProducts((current) =>
                    current.filter((item) => item.id !== product.id),
                  )
                }
              />
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-3 w-full"
            onClick={() => setProducts((current) => [...current, newProduct()])}
          >
            <Plus />
            Add an item
          </Button>
        </section>

        <section className="mt-9 border-t border-border pt-8">
          <p className="font-mono text-xs tracking-widest text-primary uppercase">
            3 · Window
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold">
            When does it end?
          </h2>
          <div className="mt-4 space-y-1.5">
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
            <p className="text-xs text-muted-foreground">
              Buyers see a live countdown until this time.
            </p>
          </div>
        </section>

        <section className="mt-9 border-t border-border pt-8">
          <p className="font-mono text-xs tracking-widest text-primary uppercase">
            4 · Fulfilment
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold">
            How will buyers get it?
          </h2>
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="fulfilment">Method</Label>
            <Select
              value={fulfilment}
              onValueChange={(value) => setFulfilment(value as Fulfilment)}
            >
              <SelectTrigger id="fulfilment" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pickup">Pickup</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
                <SelectItem value="both">Pickup or delivery</SelectItem>
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

        {error && (
          <p className="mt-6 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          className="mt-8 w-full"
          disabled={publishing || busyProductIds.length > 0}
        >
          {publishing ? (
            <>
              <LoaderCircle className="animate-spin" />
              Publishing your drop…
            </>
          ) : (
            <>
              Publish drop
              <ArrowRight />
            </>
          )}
        </Button>
      </form>
    )
  }

  return (
    <form className="flex flex-1 flex-col" onSubmit={extract}>
      <header>
        <p className="font-mono text-xs tracking-widest text-primary uppercase">
          drops.sg/new
        </p>
        <h1 className="mt-3 font-display text-5xl leading-[1.02] font-semibold tracking-tight text-balance">
          Your next drop starts with a photo.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Upload the menu or product sheets you already share. We&rsquo;ll read
          them together and turn every listing into an editable storefront
          draft.
        </p>
      </header>

      <section className="mt-8 space-y-4">
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
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="drop-slug">Link ending</Label>
          <div className="flex items-center rounded-lg border border-input bg-background focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
            <span className="shrink-0 pl-2.5 font-mono text-xs text-muted-foreground">
              /
            </span>
            <Input
              id="drop-slug"
              className="border-0 font-mono shadow-none focus-visible:ring-0"
              value={dropSlug}
              maxLength={64}
              required
              onChange={(event) => setDropSlug(event.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            We&rsquo;ll clean this up for the final URL.
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <Label htmlFor="menu-photo">Menu or product photos</Label>
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
              selectedImages.length ? 'min-h-32' : 'min-h-56'
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
                ? 'Drop photos here'
                : selectedImages.length
                  ? 'Add more photos'
                  : 'Choose or drop photos'}
            </span>
            <span className="mt-1 max-w-64 text-xs leading-relaxed text-muted-foreground">
              Up to {MAX_IMAGE_COUNT} images. We&rsquo;ll combine the listings and
              remove obvious duplicates.
            </span>
          </label>

          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              {imagePreviews.map((image, index) => (
                <div
                  key={image.id}
                  className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted"
                >
                  <Image
                    src={image.url}
                    alt={`Selected menu ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 448px) 50vw, 216px"
                    unoptimized
                  />
                  <span className="absolute bottom-2 left-2 rounded-md bg-foreground/80 px-2 py-1 font-mono text-[10px] text-background backdrop-blur-sm">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="secondary"
                    className="absolute top-2 right-2 rounded-full bg-background/90 shadow-sm backdrop-blur-sm"
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
      </section>

      {error && (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="mt-6 w-full"
        disabled={!selectedImages.length || extracting}
      >
        {extracting ? (
          <>
            <LoaderCircle className="animate-spin" />
            Reading your menu…
          </>
        ) : (
          <>
            <Sparkles />
            Draft my drop
          </>
        )}
      </Button>
      <Button
        type="button"
        size="lg"
        variant="ghost"
        className="mt-1 w-full"
        disabled={!sellerName.trim() || !dropSlug.trim()}
        onClick={() => {
          setProducts([newProduct()])
          setPhase('review')
          setError(null)
        }}
      >
        Enter items manually
      </Button>
    </form>
  )
}
