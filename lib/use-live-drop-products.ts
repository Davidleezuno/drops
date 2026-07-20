'use client'

import type { SupabaseClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

import { allSoldOut } from '@/lib/drop-state'
import type { Product } from '@/lib/types'

const POLL_INTERVAL_MS = 5_000

export function mergeLiveProduct(current: Product, incoming: Product) {
  return {
    ...current,
    ...incoming,
    // Paid stock is monotonic; a slower poll must never undo a newer event.
    stock_sold: Math.max(current.stock_sold, incoming.stock_sold),
  }
}

export function useLiveDropProducts({
  supabase,
  dropId,
  initialProducts,
  paused,
}: {
  supabase: SupabaseClient
  dropId: string
  initialProducts: Product[]
  paused: boolean
}) {
  const [products, setProducts] = useState(initialProducts)
  const soldOut = allSoldOut(products)

  useEffect(() => {
    if (paused || soldOut) return

    let active = true

    async function refreshProducts() {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('drop_id', dropId)
        .order('price', { ascending: false })
        .returns<Product[]>()

      if (!active) return
      if (error) {
        console.error('Failed to refresh drop stock', error)
        return
      }

      setProducts((current) =>
        current.map((product) => {
          const incoming = data.find((candidate) => candidate.id === product.id)
          return incoming ? mergeLiveProduct(product, incoming) : product
        }),
      )
    }

    const channel = supabase
      .channel(`drop-${dropId}-products`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products',
          filter: `drop_id=eq.${dropId}`,
        },
        (payload) => {
          const incoming = payload.new as Product
          if (incoming.drop_id !== dropId) return
          setProducts((current) =>
            current.map((product) =>
              product.id === incoming.id
                ? mergeLiveProduct(product, incoming)
                : product,
            ),
          )
        },
      )
      .subscribe((status, error) => {
        if (status === 'SUBSCRIBED') void refreshProducts()
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Drop stock realtime subscription failed', error)
        }
      })

    const poller = window.setInterval(refreshProducts, POLL_INTERVAL_MS)
    const refreshOnFocus = () => void refreshProducts()
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refreshProducts()
    }

    window.addEventListener('focus', refreshOnFocus)
    document.addEventListener('visibilitychange', refreshWhenVisible)

    return () => {
      active = false
      window.clearInterval(poller)
      window.removeEventListener('focus', refreshOnFocus)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
      void supabase.removeChannel(channel)
    }
  }, [dropId, paused, soldOut, supabase])

  return products
}
