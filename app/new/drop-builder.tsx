'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  ImagePlus,
  LoaderCircle,
  Plus,
  QrCode,
  Receipt,
  Share2,
  Sparkles,
  Store,
  X,
} from 'lucide-react'
import {
  DragEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { DraftItemCard, type ProductDraft } from '@/components/ds/draft-item-card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import type { DropDraft, StorefrontTheme } from '@/lib/drop-builder'
import { siteHost, slugify } from '@/lib/format'
import { cn } from '@/lib/utils'

type Fulfilment = 'pickup' | 'delivery' | 'both'
type Phase = 'upload' | 'review' | 'success'
type WindowPreset = 'today' | 'week' | 'month'
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
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
] as const

const FULFILMENT_OPTIONS = [
  { value: 'pickup', label: 'Pickup', detail: 'Buyers collect' },
  { value: 'delivery', label: 'Delivery', detail: 'You deliver' },
  { value: 'both', label: 'Both', detail: 'Buyers choose' },
] as const satisfies ReadonlyArray<{
  value: Fulfilment
  label: string
  detail: string
}>

const closingTime = new Intl.DateTimeFormat('en-SG', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

type SelectedImage = {
  id: string
  file: File
}

type PrefetchedEnhancement = {
  promise: Promise<Blob | null>
}

function newProduct(product?: {
  name: string
  variant: string | null
  price: number | null
  stock: number | null
  inventoryChoice: {
    name: string
    values: Array<{
      label: string
      price: number | null
      stock: number | null
    }>
  } | null
  customizations: Array<{ name: string; values: string[] }>
  sourceImageIndex?: number
}): ProductDraft {
  return {
    id: crypto.randomUUID(),
    name: product?.name ?? '',
    variant: product?.variant ?? '',
    price: product?.price === null || !product ? '' : String(product.price),
    stock: product?.stock === null || !product ? '' : String(product.stock),
    imageUrl: null,
    imageSource: null,
    sourceImageIndex: product?.sourceImageIndex ?? null,
    inventoryChoiceName: product?.inventoryChoice?.name ?? '',
    variants:
      product?.inventoryChoice?.values.map((variant) => ({
        id: crypto.randomUUID(),
        label: variant.label,
        price:
          variant.price === null
            ? product.price === null
              ? ''
              : String(product.price)
            : String(variant.price),
        stock: variant.stock === null ? '' : String(variant.stock),
      })) ?? [],
    customizations:
      product?.customizations.map((group) => ({
        id: crypto.randomUUID(),
        name: group.name,
        values: group.values,
      })) ?? [],
  }
}

function localDateTimeValue(date: Date) {
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localTime.toISOString().slice(0, 16)
}

function endOfWindow(preset: WindowPreset) {
  const end = new Date()

  if (preset === 'week') {
    end.setDate(end.getDate() + ((7 - end.getDay()) % 7))
  } else if (preset === 'month') {
    end.setMonth(end.getMonth() + 1, 0)
  }

  end.setHours(23, 59, 0, 0)
  return localDateTimeValue(end)
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

const NEEDS_INPUT_LABELS: Record<DropDraft['needsInput'][number], string> = {
  price: 'prices',
  stock: 'stock counts',
  window: 'the closing time',
  deliveryFee: 'the delivery fee',
  pickup: 'pickup details',
}

function joinLabels(labels: string[]) {
  if (labels.length <= 1) return labels.join('')
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`
}

/**
 * One step of the review flow: a numbered node on a vertical rail that flips to
 * a check once the section is settled, giving the seller a sense of progress
 * through a long form (multi-step best practice, kept on a single scroll).
 */
function ReviewSection({
  step,
  title,
  subtitle,
  complete,
  last,
  children,
}: {
  step: number
  title: string
  subtitle?: string
  complete: boolean
  last?: boolean
  children: React.ReactNode
}) {
  return (
    <section className="relative pl-11">
      {!last && (
        <span
          className="absolute top-9 left-[15px] bottom-[-2.5rem] w-px bg-border"
          aria-hidden="true"
        />
      )}
      <span
        className={cn(
          'absolute top-0 left-0 flex size-8 items-center justify-center rounded-full border font-mono text-xs font-semibold transition-colors',
          complete
            ? 'border-live bg-live-soft text-live'
            : 'border-border bg-card text-muted-foreground',
        )}
        aria-hidden="true"
      >
        {complete ? <Check className="size-4" strokeWidth={3} /> : step}
      </span>
      <div className="pt-0.5">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        )}
        <div className="mt-4">{children}</div>
      </div>
    </section>
  )
}

function ReviewLoading() {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="animate-rise mx-auto flex w-full max-w-2xl flex-1 flex-col">
      <header>
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          Building your listings…
        </h1>
      </header>

      <div className="mt-8 flex items-center gap-3" aria-live="polite">
        <span className="flex size-7 items-center justify-center rounded-full border border-flame bg-flame-soft text-flame">
          <LoaderCircle className="size-4 animate-spin" />
        </span>
        <span className="text-sm font-medium">
          Drafting listings · {elapsedSeconds}s
        </span>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="overflow-hidden rounded-2xl border border-border bg-card"
          >
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="space-y-3 p-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-9 w-full" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DropBuilder() {
  const host = siteHost()
  const [phase, setPhase] = useState<Phase>('upload')
  const [sellerName, setSellerName] = useState('')
  const [dropSlug, setDropSlug] = useState('drops')
  const [editingSlug, setEditingSlug] = useState(false)
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [products, setProducts] = useState<ProductDraft[]>([])
  const [windowEndsAt, setWindowEndsAt] = useState(() => endOfWindow('today'))
  // 'open' = no window at all (future-ideas §3); null = custom datetime.
  const [windowPreset, setWindowPreset] = useState<WindowPreset | 'open' | null>(
    'today',
  )
  const [fulfilment, setFulfilment] = useState<Fulfilment>('pickup')
  const [deliveryFee, setDeliveryFee] = useState('5')
  const [pickupNote, setPickupNote] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [published, setPublished] = useState<PublishedDrop | null>(null)
  const [projectingQr, setProjectingQr] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [busyProductIds, setBusyProductIds] = useState<string[]>([])
  const [productShotErrors, setProductShotErrors] = useState<
    Record<string, string>
  >({})
  const [theme, setTheme] = useState<StorefrontTheme | null>(null)
  const [needsInput, setNeedsInput] = useState<DropDraft['needsInput']>([])
  const [choiceNudgeDismissed, setChoiceNudgeDismissed] = useState(false)
  const draftAbortRef = useRef<AbortController | null>(null)
  const enhancementAbortRef = useRef<AbortController | null>(null)
  const prefetchedEnhancementsRef = useRef(
    new Map<number, PrefetchedEnhancement>(),
  )
  const acceptedEnhancementUrlsRef = useRef(
    new Map<number, Promise<string>>(),
  )
  const [readyEnhancementIndexes, setReadyEnhancementIndexes] = useState<
    number[]
  >([])

  const sellerSlug = slugify(sellerName, 'your-name')
  const cleanDropSlug = slugify(dropSlug, 'drops')

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

  useEffect(
    () => () => {
      draftAbortRef.current?.abort()
      enhancementAbortRef.current?.abort()
    },
    [],
  )

  function updateProduct(updated: ProductDraft) {
    setProducts((current) =>
      current.map((product) =>
        product.id === updated.id ? updated : product,
      ),
    )
  }

  function addSizesToAll() {
    setProducts((current) =>
      current.map((product) =>
        product.variants.length
          ? product
          : {
              ...product,
              inventoryChoiceName: 'Size',
              variants: ['S', 'M', 'L', 'XL'].map((label) => ({
                id: crypto.randomUUID(),
                label,
                price: product.price,
                stock: '',
              })),
            },
      ),
    )
  }

  function addChilliChoiceToAll() {
    setProducts((current) =>
      current.map((product) =>
        product.customizations.some(
          (group) => group.name.toLowerCase() === 'chilli preference',
        )
          ? product
          : {
              ...product,
              customizations: [
                ...product.customizations,
                {
                  id: crypto.randomUUID(),
                  name: 'Chilli preference',
                  values: ['Chilli', 'No chilli'],
                },
              ].slice(0, 2),
            },
      ),
    )
    setChoiceNudgeDismissed(true)
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

  async function saveUploadedProductShot(
    image: Blob,
    filename: string,
    signal?: AbortSignal,
  ) {
    const formData = new FormData()
    formData.set('mode', 'upload')
    formData.set('image', image, filename)

    const response = await fetch('/api/product-shots', {
      method: 'POST',
      body: formData,
      signal,
    })
    const result = (await response.json()) as {
      imageUrl?: string
      error?: string
    }
    if (!response.ok || !result.imageUrl) {
      throw new Error(result.error || 'That photo could not be saved.')
    }

    return result.imageUrl
  }

  async function requestEnhancedProductShot(
    image: Blob,
    filename: string,
    signal: AbortSignal,
  ) {
    const formData = new FormData()
    formData.set('mode', 'preview')
    formData.set('image', image, filename)

    const response = await fetch('/api/product-shots', {
      method: 'POST',
      body: formData,
      signal,
    })
    const mediaType = response.headers.get('content-type')?.split(';')[0]

    if (
      !response.ok ||
      !mediaType ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(mediaType)
    ) {
      throw new Error('That photo could not be prepared.')
    }

    return response.blob()
  }

  function prefetchProductShots(
    images: Blob[],
    fileNames: string[],
    controller: AbortController,
  ) {
    prefetchedEnhancementsRef.current.clear()
    acceptedEnhancementUrlsRef.current.clear()
    setReadyEnhancementIndexes([])

    const tasks = images.map((image, sourceImageIndex) => {
      const promise = requestEnhancedProductShot(
        image,
        fileNames[sourceImageIndex],
        controller.signal,
      )
        .then((enhancedImage) => {
          setReadyEnhancementIndexes((current) =>
            current.includes(sourceImageIndex)
              ? current
              : [...current, sourceImageIndex],
          )
          return enhancedImage
        })
        .catch(() => null)

      prefetchedEnhancementsRef.current.set(sourceImageIndex, { promise })
      return promise
    })

    void Promise.all(tasks).finally(() => {
      if (enhancementAbortRef.current === controller) {
        enhancementAbortRef.current = null
      }
    })
  }

  function persistPrefetchedEnhancement(
    sourceImageIndex: number,
    image: Blob,
  ) {
    const existing = acceptedEnhancementUrlsRef.current.get(sourceImageIndex)
    if (existing) return existing

    const upload = saveUploadedProductShot(
      image,
      `enhanced-${sourceImageIndex + 1}.png`,
    ).catch((error) => {
      acceptedEnhancementUrlsRef.current.delete(sourceImageIndex)
      throw error
    })
    acceptedEnhancementUrlsRef.current.set(sourceImageIndex, upload)
    return upload
  }

  async function uploadProductShot(product: ProductDraft, image: File) {
    setProductShotBusy(product.id, true)
    setProductShotError(product.id)

    try {
      const prepared = await prepareImage(image)
      const imageUrl = await saveUploadedProductShot(prepared, image.name)
      updateProductImage(product.id, imageUrl, 'uploaded')
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
      const sourceImageIndex = product.sourceImageIndex
      const prefetched =
        (product.imageSource === 'source' || product.imageSource === null) &&
        sourceImageIndex !== null
          ? prefetchedEnhancementsRef.current.get(sourceImageIndex)
          : undefined
      const prefetchedImage = await prefetched?.promise

      if (prefetchedImage && sourceImageIndex !== null) {
        const previousImageUrl = product.imageUrl
        const previousImageSource = product.imageSource
        const previewUrl = URL.createObjectURL(prefetchedImage)
        updateProductImage(product.id, previewUrl, 'generated')

        try {
          const imageUrl = await persistPrefetchedEnhancement(
            sourceImageIndex,
            prefetchedImage,
          )
          updateProductImage(product.id, imageUrl, 'generated')
        } catch (error) {
          if (previousImageUrl && previousImageSource) {
            updateProductImage(
              product.id,
              previousImageUrl,
              previousImageSource,
            )
          }
          throw error
        } finally {
          URL.revokeObjectURL(previewUrl)
        }

        return
      }

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
        // Desktop has no share sheet — copy instead, and say so plainly.
        await navigator.clipboard.writeText(published.buyerUrl)
        setShareCopied(true)
        window.setTimeout(() => setShareCopied(false), 1800)
      }
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return
      console.error('Could not share buyer link', caught)
    }
  }

  async function fetchDraft(
    images: Blob[],
    fileNames: string[],
    signal?: AbortSignal,
  ): Promise<DropDraft> {
    const formData = new FormData()
    images.forEach((image, index) => {
      formData.append('images', image, fileNames[index] ?? `menu-${index + 1}.jpg`)
    })
    const response = await fetch('/api/draft', {
      method: 'POST',
      body: formData,
      signal,
    })
    const result = (await response.json()) as DropDraft & { error?: string }

    if (!response.ok || !result.products?.length) {
      throw new Error(
        result.error ||
          'We could not find any items with prices in those photos. Try a clearer photo, or add items by hand.',
      )
    }
    return result
  }

  async function extract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedImages.length) return

    setExtracting(true)
    setError(null)
    // Take the seller to the destination right away so progress remains
    // visible while the model works.
    setProducts([])
    setPhase('review')
    draftAbortRef.current?.abort()
    enhancementAbortRef.current?.abort()
    const controller = new AbortController()
    const enhancementController = new AbortController()
    draftAbortRef.current = controller
    enhancementAbortRef.current = enhancementController

    try {
      const maxBytesPerImage = Math.floor(
        MAX_UPLOAD_BYTES / selectedImages.length,
      )
      const images = await Promise.all(
        selectedImages.map(({ file }) =>
          prepareImage(file, maxBytesPerImage),
        ),
      )
      const fileNames = selectedImages.map(
        ({ file }) => file.name || `menu.jpg`,
      )
      prefetchProductShots(images, fileNames, enhancementController)
      const draftPromise = fetchDraft(images, fileNames, controller.signal)
      const savedImagesPromise = Promise.allSettled(
        images.map((image, index) =>
          saveUploadedProductShot(
            image,
            fileNames[index],
            controller.signal,
          ),
        ),
      )
      const [result, savedImages] = await Promise.all([
        draftPromise,
        savedImagesPromise,
      ])
      const imageUrls = savedImages.map((saved) =>
        saved.status === 'fulfilled' ? saved.value : null,
      )
      const drafts = result.products.map((product) => {
        const draft = newProduct(product)
        const imageUrl = imageUrls[product.sourceImageIndex] ?? null

        return imageUrl
          ? { ...draft, imageUrl, imageSource: 'source' as const }
          : draft
      })

      setProducts(drafts)
      setChoiceNudgeDismissed(false)
      setProductShotErrors(
        Object.fromEntries(
          drafts
            .filter((product) => !product.imageUrl)
            .map((product) => [
              product.id,
              'We could not attach the source photo. You can add one here.',
            ]),
        ),
      )
      setTheme(result.theme)
      setNeedsInput(result.needsInput)
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return
      enhancementController.abort()
      // Send the seller back to their photos with the reason — they never get
      // stranded on an empty review screen.
      setPhase('upload')
      setError(
        caught instanceof Error
          ? caught.message
          : 'We could not read those photos. Try again, or add items by hand.',
      )
    } finally {
      if (draftAbortRef.current === controller) draftAbortRef.current = null
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
            stock: product.stock.trim() === '' ? null : Number(product.stock),
            imageUrl: product.imageUrl,
            inventoryChoice:
              product.variants.length >= 2 &&
              product.inventoryChoiceName.trim()
                ? {
                    name: product.inventoryChoiceName.trim(),
                    variants: product.variants.map((variant) => ({
                      label: variant.label.trim(),
                      price: Number(variant.price || product.price),
                      stock:
                        variant.stock.trim() === ''
                          ? null
                          : Number(variant.stock),
                    })),
                  }
                : null,
            customizations: product.customizations
              .map((group) => ({
                name: group.name.trim(),
                values: group.values.map((value) => value.trim()).filter(Boolean),
              }))
              .filter((group) => group.name && group.values.length >= 2),
          })),
          windowEndsAt:
            windowPreset === 'open'
              ? null
              : new Date(windowEndsAt).toISOString(),
          fulfilment,
          deliveryFee: fulfilment === 'pickup' ? 0 : Number(deliveryFee),
          pickupNote:
            fulfilment === 'delivery' ? null : pickupNote.trim() || null,
          theme,
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
      <section className="animate-rise mx-auto flex w-full max-w-md flex-1 flex-col">
        <Dialog open={projectingQr} onOpenChange={setProjectingQr}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Scan to buy</DialogTitle>
              <DialogDescription className="font-mono text-[11px] break-all">
                {publishedHost}/{published.sellerSlug}/{published.dropSlug}
              </DialogDescription>
            </DialogHeader>
            <div className="mx-auto w-full max-w-64 rounded-xl bg-white p-3">
              <Image
                src={published.qrDataUrl}
                alt={`QR code for ${published.buyerUrl}`}
                width={640}
                height={640}
                className="size-full"
                unoptimized
                priority
              />
            </div>
          </DialogContent>
        </Dialog>

        <header className="text-center">
          <p className="font-mono text-xs tracking-widest text-live uppercase">
            Live now
          </p>
          <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight text-balance">
            Your drop is live.
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Two things left: share it, and keep the link to your orders.
          </p>
        </header>

        {/* 1 — Share. One clear link, one primary action. */}
        <div className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
            Share your drop
          </p>
          <a
            href={published.buyerUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-3.5 py-3 transition-colors hover:border-flame/40 hover:bg-accent/50"
          >
            <span className="truncate font-mono text-xs sm:text-sm">
              {publishedHost}/{published.sellerSlug}/
              <span className="font-medium text-flame">
                {published.dropSlug}
              </span>
            </span>
            <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
          </a>
          <Button
            type="button"
            size="lg"
            className="mt-3 h-12 w-full"
            onClick={shareBuyerLink}
          >
            {shareCopied ? <Check /> : <Share2 />}
            {shareCopied ? 'Link copied' : 'Share link'}
          </Button>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <CopyButton value={published.buyerUrl} label="Copy link" />
            <Button
              type="button"
              variant="outline"
              onClick={() => setProjectingQr(true)}
            >
              <QrCode />
              Show QR
            </Button>
          </div>
        </div>

        {/* 2 — Track orders. The manage link is the only way back. */}
        <div className="mt-4 rounded-2xl border border-border bg-muted p-4">
          <div className="flex items-center gap-2">
            <Receipt className="size-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Track your orders</p>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            Save this link — it&rsquo;s the only way back to your orders, and
            anyone who has it can manage your drop.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              type="button"
              nativeButton={false}
              render={<Link href={managePath} />}
            >
              <Receipt />
              Track orders
            </Button>
            <CopyButton value={published.manageUrl} label="Copy" />
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={
              <Link href={`/${published.sellerSlug}/${published.dropSlug}`} />
            }
          >
            <Store />
            Walk your 3D store
          </Button>
          <Button
            variant="ghost"
            size="sm"
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
    if (extracting && !products.length) {
      return <ReviewLoading />
    }

    const closesAt = new Date(windowEndsAt)
    const closesLabel =
      windowPreset === 'open'
        ? 'No closing time — link stays live'
        : Number.isNaN(closesAt.getTime())
          ? 'Pick a closing time'
          : `Closes ${closingTime.format(closesAt)}`

    let stepCounter = 0
    const productsStep = ++stepCounter
    const windowStep = ++stepCounter
    const fulfilmentStep = ++stepCounter

    const productsComplete =
      products.length > 0 &&
      products.every((product) => product.name.trim() && product.price.trim())
    const windowComplete =
      windowPreset !== null || !Number.isNaN(closesAt.getTime())
    const fulfilmentComplete =
      fulfilment === 'pickup' || deliveryFee.trim() !== ''
    const missingPrice =
      needsInput.includes('price') && products.some((product) => !product.price)
    const softNeeds = needsInput
      .filter((key) => key !== 'price')
      .map((key) => NEEDS_INPUT_LABELS[key])

    return (
      <form
        className="animate-rise mx-auto flex w-full max-w-2xl flex-1 flex-col"
        onSubmit={publish}
      >
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
            <span className="font-medium text-flame">{cleanDropSlug}</span>
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
            Confirm Product Listings.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {selectedImages.length
              ? `We read ${products.length} ${products.length === 1 ? 'item' : 'items'} from your photos. Fix anything wrong — this is what buyers will see.`
              : 'Add each item, price and how many you have. This is what buyers will see.'}
          </p>
        </header>

        {softNeeds.length > 0 && (
          <div className="animate-rise mt-6 rounded-xl border border-flame/20 bg-accent/60 px-4 py-3">
            <p className="text-sm font-medium">
              A few details weren&rsquo;t in your photos
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Double-check {joinLabels(softNeeds)} below — we&rsquo;ve set safe
              defaults where we could.
            </p>
          </div>
        )}

        <div className="mt-8 space-y-10">
          <ReviewSection
            step={productsStep}
            title="Products"
            subtitle="This is exactly what buyers will see. Fix anything that looks off."
            complete={productsComplete}
          >
            <div className="space-y-4">
          {!choiceNudgeDismissed &&
            theme?.vertical === 'fashion' &&
            products.some((product) => !product.variants.length) && (
              <div className="animate-rise rounded-2xl border border-flame/20 bg-accent p-4">
                <p className="text-sm font-semibold">Selling these in sizes?</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Add S–XL to every item now, then enter only the stock that differs.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button type="button" size="sm" onClick={addSizesToAll}>
                    Add sizes to all
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setChoiceNudgeDismissed(true)}
                  >
                    Not needed
                  </Button>
                </div>
              </div>
            )}

          {!choiceNudgeDismissed &&
            theme?.vertical === 'fnb' &&
            products.every((product) => !product.customizations.length) && (
              <div className="animate-rise rounded-2xl border border-flame/20 bg-accent p-4">
                <p className="text-sm font-semibold">Any choice for every order?</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Add a shared-stock preference in one tap, or keep these items as they are.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button type="button" size="sm" onClick={addChilliChoiceToAll}>
                    Add chilli preference
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setChoiceNudgeDismissed(true)}
                  >
                    No shared choice
                  </Button>
                </div>
              </div>
            )}

              <div className="space-y-4">
                {products.map((product) => (
                  <DraftItemCard
                    key={product.id}
                    product={product}
                    canRemove={products.length > 1}
                    busy={busyProductIds.includes(product.id)}
                    enhancementReady={
                      (product.imageSource === 'source' ||
                        product.imageSource === null) &&
                      product.sourceImageIndex !== null &&
                      readyEnhancementIndexes.includes(
                        product.sourceImageIndex,
                      )
                    }
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
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() =>
                  setProducts((current) => [...current, newProduct()])
                }
              >
                <Plus />
                Add an item
              </Button>
            </div>
          </ReviewSection>

          <ReviewSection
            step={windowStep}
            title="Selling window"
            subtitle="Buyers see a countdown. The link stops selling when it hits zero."
            complete={windowComplete}
          >
            <div className="flex flex-wrap gap-2" aria-label="Selling window">
              {WINDOW_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  type="button"
                  variant={windowPreset === preset.value ? 'default' : 'outline'}
                  className="h-11 px-4"
                  aria-pressed={windowPreset === preset.value}
                  onClick={() => {
                    setWindowPreset(preset.value)
                    setWindowEndsAt(endOfWindow(preset.value))
                  }}
                >
                  {preset.label}
                </Button>
              ))}
              <Button
                type="button"
                variant={windowPreset === 'open' ? 'default' : 'outline'}
                className="h-11 px-4"
                aria-pressed={windowPreset === 'open'}
                onClick={() => setWindowPreset('open')}
              >
                Keep open
              </Button>
              <Button
                type="button"
                variant={windowPreset === null ? 'default' : 'outline'}
                className="h-11 px-4"
                aria-pressed={windowPreset === null}
                onClick={() => setWindowPreset(null)}
              >
                Custom
              </Button>
            </div>

          {windowPreset === 'open' && (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              No countdown. The link stays live until you end it from your
              console — a permanent storefront.
            </p>
          )}

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
          </ReviewSection>

          <ReviewSection
            step={fulfilmentStep}
            title="How buyers get it"
            complete={fulfilmentComplete}
            last
          >
            <div
              className="grid grid-cols-3 gap-2"
              role="radiogroup"
              aria-label="How buyers get their orders"
            >
            {FULFILMENT_OPTIONS.map((option) => {
              const selected = fulfilment === option.value

              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={cn(
                    'relative min-h-24 rounded-xl border p-3 text-left transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                    selected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card hover:border-primary/50',
                  )}
                  onClick={() => setFulfilment(option.value)}
                >
                  <span className="block text-sm font-semibold">
                    {option.label}
                  </span>
                  <span
                    className={cn(
                      'mt-1 block text-xs leading-snug',
                      selected
                        ? 'text-primary-foreground/75'
                        : 'text-muted-foreground',
                    )}
                  >
                    {option.detail}
                  </span>
                  {selected && (
                    <span className="absolute right-2.5 bottom-2.5 flex size-5 items-center justify-center rounded-full bg-primary-foreground text-primary">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                  )}
                </button>
              )
            })}
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
          </ReviewSection>
        </div>

        <div className="mt-9 border-t border-border pt-4">
          {missingPrice && (
            <p className="mb-3 text-xs font-medium text-destructive">
              Add the missing prices before you open.
            </p>
          )}
          {error && (
            <p className="mb-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            className="h-12 w-full"
            disabled={publishing || busyProductIds.length > 0 || !productsComplete}
          >
            {publishing ? (
              <>
                <LoaderCircle className="animate-spin" />
                Opening…
              </>
            ) : (
              <>
                Open for Business
                <ArrowRight />
              </>
            )}
          </Button>
          {productsComplete ? (
            <p className="mt-2 text-center font-mono text-xs text-muted-foreground tabular-nums">
              {products.length} {products.length === 1 ? 'item' : 'items'} ·{' '}
              {closesLabel}
            </p>
          ) : (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Add a name and price to every item to open for business.
            </p>
          )}
        </div>
      </form>
    )
  }

  return (
    <form
      className="mx-auto flex w-full max-w-md flex-1 flex-col"
      onSubmit={extract}
    >
      <header>
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Step 1 of 2
        </p>
        <h1 className="mt-3 font-display text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl">
          Upload product photos to a storefront.
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
            <span className="flex size-12 items-center justify-center rounded-full bg-accent text-flame transition-transform group-hover:scale-105">
              <ImagePlus className="size-5" />
            </span>
            <span className="mt-3 text-sm font-semibold">
              {dragActive
                ? 'Drop them here'
                : selectedImages.length
                  ? 'Add another photo'
                  : 'Choose photos'}
            </span>
            <span className="mt-1 max-w-72 text-xs leading-relaxed text-muted-foreground">
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
          <Label htmlFor="seller-name">Your store name</Label>
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
              <span className="font-medium text-flame">{cleanDropSlug}</span>
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
              placeholder="drops"
              required
              onChange={(event) => setDropSlug(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Keep /drops, or name it for a sale: weekend-bake, live-sale.
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
            Creating listings…
          </>
        ) : (
          <>
            <Sparkles />
            Create Product Listings
          </>
        )}
      </Button>
      <Button
        type="button"
        size="lg"
        variant="ghost"
        className="mt-1 w-full"
        disabled={!sellerName.trim() || extracting}
        onClick={() => {
          setProducts([newProduct()])
          setPhase('review')
          setError(null)
        }}
      >
        Add items manually
      </Button>
    </form>
  )
}
