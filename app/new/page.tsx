import { Shell } from '@/components/ds/shell'

import { DropBuilder } from './drop-builder'

export const metadata = {
  title: 'Create a drop · Drops',
  description: 'Turn a menu photo into a live storefront in under a minute.',
}

export default function NewDropPage() {
  return (
    <Shell>
      <DropBuilder />
    </Shell>
  )
}
