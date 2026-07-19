import type { DraftImage } from '@/lib/agents/types'

const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const MAX_IMAGE_COUNT = 5
const MAX_TOTAL_IMAGE_BYTES = 4 * 1024 * 1024

export type DraftImageValidationError = {
  error: string
  status: 400
}

export async function readValidatedImages(
  request: Request,
): Promise<DraftImage[] | DraftImageValidationError> {
  const formData = await request.formData().catch(() => null)
  const submittedImages = formData?.getAll('images') ?? []
  const legacyImage = formData?.get('image')
  const images = submittedImages.length
    ? submittedImages
    : legacyImage
      ? [legacyImage]
      : []

  if (
    !images.length ||
    images.some(
      (image) =>
        !(image instanceof File) || !image.type.startsWith('image/'),
    )
  ) {
    return {
      error: 'Choose one or more menu or product images to continue.',
      status: 400,
    }
  }

  if (images.length > MAX_IMAGE_COUNT) {
    return {
      error: `Use up to ${MAX_IMAGE_COUNT} images at a time.`,
      status: 400,
    }
  }

  const imageFiles = images as File[]
  const totalImageBytes = imageFiles.reduce(
    (total, image) => total + image.size,
    0,
  )

  if (
    imageFiles.some(
      (image) => image.size === 0 || image.size > MAX_IMAGE_BYTES,
    ) ||
    totalImageBytes > MAX_TOTAL_IMAGE_BYTES
  ) {
    return {
      error: 'Keep the combined photo upload under 4 MB.',
      status: 400,
    }
  }

  return Promise.all(
    imageFiles.map(async (image) => ({
      bytes: new Uint8Array(await image.arrayBuffer()),
      mediaType: image.type,
    })),
  )
}
