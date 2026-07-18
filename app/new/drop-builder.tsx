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
import { FormEvent, useEffect, useMemo, useState } from 'react'

import {
  ExtractedProductRow,
  type ProductDraft,
} from '@/components/ds/extracted-product-row'
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
const COMPRESSION_THRESHOLD_BYTES = 3 * 1024 * 1024

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
  }
}

function localDateTimeValue(date: Date) {
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localTime.toISOString().slice(0, 16)
}

async function prepareImage(file: File) {
  if (file.size <= COMPRESSION_THRESHOLD_BYTES) return file

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    const compressed = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.82),
    )

    if (compressed && compressed.size <= MAX_UPLOAD_BYTES) return compressed
  } catch {
    // The original file may still fit the request limit; validate it below.
  }

  if (file.size <= MAX_UPLOAD_BYTES) return file
  throw new Error('That photo is too large. Choose one under 4 MB.')
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
  const [file, setFile] = useState<File | null>(null)
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

  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  )

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    },
    [previewUrl],
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
    if (!file) return

    setExtracting(true)
    setError(null)

    try {
      const image = await prepareImage(file)
      const formData = new FormData()
      formData.set('image', image, 'menu.jpg')

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
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs tracking-widest text-primary uppercase">
                1 · Stock
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
            2 · Window
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
            3 · Fulfilment
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
          disabled={publishing}
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
          Upload the menu or product sheet you already share. We&rsquo;ll turn it
          into an editable storefront draft.
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
          <Label htmlFor="menu-photo">Menu or product photo</Label>
          <input
            id="menu-photo"
            className="sr-only"
            type="file"
            accept="image/*"
            required
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null)
              setError(null)
            }}
          />
          <label
            htmlFor="menu-photo"
            className="group relative flex min-h-56 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-card text-center transition-colors hover:border-primary/50 focus-within:border-ring"
          >
            {previewUrl ? (
              <>
                <Image
                  src={previewUrl}
                  alt="Selected menu preview"
                  fill
                  className="object-cover"
                  sizes="(max-width: 448px) 100vw, 448px"
                  unoptimized
                />
                <span className="absolute inset-x-3 bottom-3 rounded-lg bg-foreground/85 px-3 py-2 text-xs text-background backdrop-blur-sm">
                  Tap to choose a different photo
                </span>
              </>
            ) : (
              <>
                <span className="flex size-12 items-center justify-center rounded-full bg-accent text-primary transition-transform group-hover:scale-105">
                  <ImagePlus className="size-5" />
                </span>
                <span className="mt-4 text-sm font-semibold">
                  Choose from your phone
                </span>
                <span className="mt-1 max-w-56 text-xs leading-relaxed text-muted-foreground">
                  A clear photo or screenshot works best. Large photos are
                  compressed before upload.
                </span>
              </>
            )}
          </label>
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
        disabled={!file || extracting}
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
