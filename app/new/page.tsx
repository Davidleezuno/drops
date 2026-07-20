import { Shell } from '@/components/ds/shell'

import { DropBuilder } from './drop-builder'

export const metadata = {
  title: 'Create a drop · Drops',
  description: 'Turn a menu photo into a live storefront in under a minute.',
}

export default function NewDropPage() {
  return (
    // Wider than the buyer shell so the review step can lay products out in a
    // grid; each phase re-centers its own content to the width it wants.
    <Shell width="console">
      <DropBuilder />
    </Shell>
  )
}
