'use client'

import { DoorOpen, Users } from 'lucide-react'
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
}: Omit<
  WorldCanvasProps,
  'config' | 'entering' | 'onExit' | 'onFull' | 'onReady'
> & {
  config: SceneConfig | null
  fallback: ReactNode
}) {
  const [capable, setCapable] = useState(false)
  const [showWorld, setShowWorld] = useState(false)
  const [worldReady, setWorldReady] = useState(false)
  const [entering, setEntering] = useState(false)
  const [doorOpening, setDoorOpening] = useState(false)
  const entranceTimer = useRef<number | null>(null)
  const doorTimer = useRef<number | null>(null)
  const [storeFull, setStoreFull] = useState(false)

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
      if (doorTimer.current !== null) {
        window.clearTimeout(doorTimer.current)
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
    setDoorOpening(false)
    setStoreFull(false)
    setShowWorld(false)
  }, [])

  const enterStore = useCallback(() => {
    const url = new URL(window.location.href)
    url.searchParams.delete('list')
    url.searchParams.set('store', '1')
    window.history.pushState({}, '', url)
    setWorldReady(false)
    setStoreFull(false)
    setEntering(true)
    setShowWorld(true)
  }, [])

  const beginEnterStore = useCallback(() => {
    if (doorOpening) return

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (reducedMotion) {
      enterStore()
      return
    }

    setDoorOpening(true)
    doorTimer.current = window.setTimeout(() => {
      enterStore()
      doorTimer.current = null
    }, 280)
  }, [doorOpening, enterStore])

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

  const handleWorldFull = useCallback(() => {
    const url = new URL(window.location.href)
    url.searchParams.delete('store')
    window.history.replaceState({}, '', url)
    setWorldReady(false)
    setEntering(false)
    setDoorOpening(false)
    setShowWorld(false)
    setStoreFull(true)
  }, [])

  return (
    <>
      {(!showWorld || !worldReady) && fallback}
      {config && capable && !showWorld && (
        <div className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] z-30 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2">
          {storeFull && (
            <div
              className="max-w-xs rounded-2xl border border-border bg-card px-4 py-3 text-sm shadow-lg"
              role="status"
            >
              <p className="font-semibold">The store is full right now</p>
              <p className="mt-0.5 text-muted-foreground">
                You can keep shopping here.
              </p>
            </div>
          )}
          <button
            type="button"
            className="enter-store-button group inline-flex h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg outline-none transition-[transform,box-shadow] duration-150 ease-out active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            data-opening={doorOpening ? 'true' : 'false'}
            aria-busy={doorOpening}
            onClick={beginEnterStore}
          >
            <span className="enter-store-door" aria-hidden="true">
              {storeFull ? (
                <Users className="size-4" strokeWidth={1.8} />
              ) : (
                <DoorOpen className="size-4" strokeWidth={1.8} />
              )}
            </span>
            {storeFull ? 'Try entering again' : 'Enter store'}
          </button>
        </div>
      )}
      {config && showWorld && (
        <DynamicWorld
          {...worldProps}
          config={config}
          entering={entering}
          onReady={markWorldReady}
          onFull={handleWorldFull}
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
