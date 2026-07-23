'use client'

import { DoorOpen } from 'lucide-react'
import dynamic from 'next/dynamic'
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

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
}: Omit<WorldCanvasProps, 'config' | 'entering' | 'onExit' | 'onReady'> & {
  config: SceneConfig | null
  fallback: ReactNode
}) {
  const [capable, setCapable] = useState(false)
  const [showWorld, setShowWorld] = useState(false)
  const [worldReady, setWorldReady] = useState(false)
  const [entering, setEntering] = useState(false)
  const entranceTimer = useRef<number | null>(null)

  useEffect(() => {
    if (!config) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    const chooseRenderer = () => {
      const supported = !reducedMotion.matches && webglAvailable()
      const storeRequested =
        new URLSearchParams(window.location.search).get('store') === '1'
      setCapable(supported)
      setShowWorld(supported && storeRequested)
      if (!supported || !storeRequested) {
        setWorldReady(false)
        setEntering(false)
        if (entranceTimer.current !== null) {
          window.clearTimeout(entranceTimer.current)
          entranceTimer.current = null
        }
      }
    }

    chooseRenderer()
    reducedMotion.addEventListener('change', chooseRenderer)
    window.addEventListener('popstate', chooseRenderer)
    return () => {
      reducedMotion.removeEventListener('change', chooseRenderer)
      window.removeEventListener('popstate', chooseRenderer)
    }
  }, [config])

  useEffect(
    () => () => {
      if (entranceTimer.current !== null) {
        window.clearTimeout(entranceTimer.current)
      }
    },
    [],
  )

  const showProductGrid = useCallback(() => {
    const url = new URL(window.location.href)
    url.searchParams.delete('store')
    url.searchParams.delete('list')
    window.history.pushState({}, '', url)
    setWorldReady(false)
    setEntering(false)
    setShowWorld(false)
  }, [])

  const enterStore = useCallback(() => {
    const url = new URL(window.location.href)
    url.searchParams.delete('list')
    url.searchParams.set('store', '1')
    window.history.pushState({}, '', url)
    setWorldReady(false)
    setEntering(true)
    setShowWorld(true)
  }, [])

  const markWorldReady = useCallback(() => {
    setWorldReady(true)
    if (!entering) return

    if (entranceTimer.current !== null) {
      window.clearTimeout(entranceTimer.current)
    }
    entranceTimer.current = window.setTimeout(() => {
      setEntering(false)
      entranceTimer.current = null
    }, 420)
  }, [entering])

  return (
    <>
      {(!showWorld || !worldReady) && fallback}
      {config && capable && !showWorld && (
        <button
          type="button"
          className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] z-30 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg transition-transform duration-150 active:scale-[0.98]"
          onClick={enterStore}
        >
          <DoorOpen className="size-4" />
          Enter store
        </button>
      )}
      {config && showWorld && (
        <DynamicWorld
          {...worldProps}
          config={config}
          entering={entering}
          onReady={markWorldReady}
          onExit={showProductGrid}
        />
      )}
      {config && entering && (
        <div
          className="world-entry-fade"
          data-ready={worldReady ? 'true' : 'false'}
          aria-hidden="true"
        />
      )}
    </>
  )
}
