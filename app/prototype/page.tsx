import type { Metadata } from 'next'

import { DEFAULT_VARIANT } from './data'
import { PrototypeApp } from './prototype-app'

export const metadata: Metadata = {
  title: 'Drops — storefront prototype',
}

/** PROTOTYPE route: /prototype?variant=shophouse|front-room|conservatory */
export default async function PrototypePage({
  searchParams,
}: {
  searchParams: Promise<{ variant?: string }>
}) {
  const { variant = DEFAULT_VARIANT } = await searchParams
  return <PrototypeApp variantKey={variant} />
}
