import { NextResponse } from 'next/server'

import {
  endManagedDrop,
  getManageSnapshot,
  keepDropAlive,
  ManageConsoleError,
} from '@/lib/manage'

const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
}

function notFoundResponse() {
  return NextResponse.json(
    { error: 'Drop not found' },
    { status: 404, headers: PRIVATE_HEADERS },
  )
}

function errorResponse(caught: unknown) {
  if (caught instanceof ManageConsoleError) {
    console.error(caught.message)
  } else {
    console.error('Seller console request failed', caught)
  }

  return NextResponse.json(
    { error: 'Could not refresh the seller console' },
    { status: 500, headers: PRIVATE_HEADERS },
  )
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  try {
    const snapshot = await getManageSnapshot(token)
    if (!snapshot) return notFoundResponse()

    return NextResponse.json(snapshot, { headers: PRIVATE_HEADERS })
  } catch (caught) {
    return errorResponse(caught)
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const body = (await request.json().catch(() => null)) as {
    action?: unknown
  } | null
  const action = body?.action === 'keep_alive' ? 'keep_alive' : 'end'

  try {
    const snapshot =
      action === 'keep_alive'
        ? await keepDropAlive(token)
        : await endManagedDrop(token)
    if (!snapshot) return notFoundResponse()

    return NextResponse.json(snapshot, { headers: PRIVATE_HEADERS })
  } catch (caught) {
    return errorResponse(caught)
  }
}
