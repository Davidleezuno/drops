import { notFound } from 'next/navigation'

import { Shell } from '@/components/ds/shell'
import { getManageSnapshot } from '@/lib/manage'

import { ManageConsole } from './manage-console'

export const dynamic = 'force-dynamic'

export default async function ManagePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const snapshot = await getManageSnapshot(token)

  if (!snapshot) notFound()

  return (
    <Shell width="console">
      <ManageConsole token={token} initialSnapshot={snapshot} />
    </Shell>
  )
}
