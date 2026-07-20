'use client'

import { DoorOpen } from 'lucide-react'
import dynamic from 'next/dynamic'
import { type ReactNode, useCallback, useEffect, useState } from 'react'

import type { SceneConfig } from '@/lib/world/scene-config'

import type { WorldCanvasProps } from './world-canvas'

const DynamicWorld = dynamic<WorldCanvasProps>(
  () => import('./world-canvas').then((module) => module.WorldCanvas),
  { ssr: false, loading: () => null },
)

function webglAvailable() {
  try {
    const canvas = document.createElement('canvas')
    const context =
      canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true }) ??
      canvas.getContext('webgl', { failIfMajorPerformanceCaveat: true })
    if (!context) return false
    context.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}

export function WorldGate({
  config,
  fallback,
  ...worldProps
}: Omit<WorldCanvasProps, 'config' | 'onExit' | 'onReady'> & {
  config: SceneConfig | null
  fallback: ReactNode
}) {
  const [capable, setCapable] = useState(false)
  const [showWorld, setShowWorld] = useState(false)
  const [worldReady, setWorldReady] = useState(false)

  useEffect(() => {
    if (!config) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    const chooseRenderer = () => {
      const supported = !reducedMotion.matches && webglAvailable()
      setCapable(supported)
      setShowWorld(
        supported && new URLSearchParams(window.location.search).get('list') !== '1',
      )
    }

    chooseRenderer()
    reducedMotion.addEventListener('change', chooseRenderer)
    window.addEventListener('popstate', chooseRenderer)
    return () => {
      reducedMotion.removeEventListener('change', chooseRenderer)
      window.removeEventListener('popstate', chooseRenderer)
    }
  }, [config])

  const setListMode = useCallback((list: boolean) => {
    const url = new URL(window.location.href)
    if (list) url.searchParams.set('list', '1')
    else url.searchParams.delete('list')
    window.history.pushState({}, '', url)
    setWorldReady(false)
    setShowWorld(!list)
  }, [])

  const markWorldReady = useCallback(() => setWorldReady(true), [])

  return (
    <>
      {(!showWorld || !worldReady) && fallback}
      {config && capable && !showWorld && (
        <button
          type="button"
          className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] z-30 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg"
          onClick={() => setListMode(false)}
        >
          <DoorOpen className="size-4" />
          Back to store
        </button>
      )}
      {config && showWorld && (
        <DynamicWorld
          {...worldProps}
          config={config}
          onReady={markWorldReady}
          onExit={() => setListMode(true)}
        />
      )}
    </>
  )
}
