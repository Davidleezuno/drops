'use client'

import type { SupabaseClient } from '@supabase/supabase-js'
import { useEffect, useRef, useState } from 'react'

import { allSoldOut } from '@/lib/drop-state'
import { dropProductsTopic } from '@/lib/social-events'
import type { Product, ProductVariant } from '@/lib/types'

const POLL_INTERVAL_MS = 5_000

export function mergeLiveProduct(current: Product, incoming: Product) {
  return {
    ...current,
    ...incoming,
    // Paid stock is monotonic; a slower poll must never undo a newer event.
    stock_sold: Math.max(current.stock_sold, incoming.stock_sold),
  }
}

function mergeLiveVariant(current: ProductVariant, incoming: ProductVariant) {
  return {
    ...current,
    ...incoming,
    stock_sold: Math.max(current.stock_sold, incoming.stock_sold),
  }
}

export function useLiveDropProducts({
  supabase,
  dropId,
  initialProducts,
  paused,
  onAppreciation,
  onPaidStockChange,
}: {
  supabase: SupabaseClient
  dropId: string
  initialProducts: Product[]
  paused: boolean
  onAppreciation?: (payload: unknown) => void
  onPaidStockChange?: (productName: string, quantity: number) => void
}) {
  const [products, setProducts] = useState(initialProducts)
  const productsRef = useRef(initialProducts)
  const soldOut = allSoldOut(products)

  useEffect(() => {
    productsRef.current = products
  }, [products])

  useEffect(() => {
    if (paused || soldOut) return

    let active = true

    async function refreshProducts() {
      const { data, error } = await supabase
        .from('products')
        .select('*, variants:product_variants(*)')
        .eq('drop_id', dropId)
        .order('price', { ascending: false })
        .returns<Product[]>()

      if (!active) return
      if (error) {
        console.error('Failed to refresh drop stock', error)
        return
      }

      const announcements: Array<{ name: string; quantity: number }> = []
      const next = productsRef.current.map((product) => {
        const incoming = data.find((candidate) => candidate.id === product.id)
        if (!incoming) return product
        const quantity = Math.max(0, incoming.stock_sold - product.stock_sold)
        if (quantity > 0) announcements.push({ name: product.name, quantity })
        return mergeLiveProduct(product, incoming)
      })
      productsRef.current = next
      setProducts(next)
      announcements.forEach(({ name, quantity }) =>
        onPaidStockChange?.(name, quantity),
      )
    }

    const channel = supabase
      .channel(dropProductsTopic(dropId))
      .on('broadcast', { event: 'appreciation' }, ({ payload }) => {
        onAppreciation?.(payload)
      })
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
          const currentProduct = productsRef.current.find(
            (product) => product.id === incoming.id,
          )
          const quantity = currentProduct
            ? Math.max(0, incoming.stock_sold - currentProduct.stock_sold)
            : 0
          const next = productsRef.current.map((product) =>
            product.id === incoming.id
              ? mergeLiveProduct(product, incoming)
              : product,
          )
          productsRef.current = next
          setProducts(next)
          if (quantity > 0 && currentProduct) {
            onPaidStockChange?.(currentProduct.name, quantity)
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'product_variants',
        },
        (payload) => {
          const incoming = payload.new as ProductVariant
          const next = productsRef.current.map((product) =>
            product.id !== incoming.product_id
              ? product
              : {
                  ...product,
                  variants: product.variants.map((variant) =>
                    variant.id === incoming.id
                      ? mergeLiveVariant(variant, incoming)
                      : variant,
                  ),
                },
          )
          productsRef.current = next
          setProducts(next)
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
  }, [
    dropId,
    onAppreciation,
    onPaidStockChange,
    paused,
    soldOut,
    supabase,
  ])

  return products
}
