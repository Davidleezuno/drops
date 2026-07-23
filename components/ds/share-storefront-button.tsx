'use client'

import { Check, Copy, Share2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type CopyState = 'idle' | 'copied' | 'failed'

function supportsNativeShare(title: string) {
  if (typeof window === 'undefined' || typeof navigator.share !== 'function') {
    return false
  }
  const payload = { title, url: window.location.href }
  try {
    return !navigator.canShare || navigator.canShare(payload)
  } catch {
    return false
  }
}

async function copyPlainText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()
  if (!copied) throw new Error('Copy command failed')
}

export function ShareStorefrontButton({ title }: { title: string }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const firstActionRef = useRef<HTMLButtonElement>(null)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nativeShareAvailable = supportsNativeShare(title)

  useEffect(() => {
    if (!menuOpen) return

    firstActionRef.current?.focus()

    function closeOnOutsideClick(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setMenuOpen(false)
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [menuOpen])

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current)
    },
    [],
  )

  function resetCopyStateSoon() {
    if (resetTimer.current) clearTimeout(resetTimer.current)
    resetTimer.current = setTimeout(() => setCopyState('idle'), 2_000)
  }

  async function copyLink() {
    try {
      await copyPlainText(window.location.href)
      setCopyState('copied')
      setMenuOpen(false)
    } catch {
      setCopyState('failed')
    }
    resetCopyStateSoon()
  }

  async function shareNatively() {
    setSharing(true)
    try {
      await navigator.share({ title, url: window.location.href })
      setMenuOpen(false)
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setCopyState('failed')
        resetCopyStateSoon()
      }
    } finally {
      setSharing(false)
    }
  }

  return (
    <div ref={containerRef} className="relative inline-flex shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={
          copyState === 'copied' ? 'Storefront link copied' : 'Share storefront'
        }
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        title={copyState === 'copied' ? 'Link copied' : 'Share storefront'}
      >
        {copyState === 'copied' ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <Share2 className="size-4" aria-hidden="true" />
        )}
        <span className="sr-only" aria-live="polite">
          {copyState === 'copied'
            ? 'Link copied'
            : copyState === 'failed'
              ? 'Could not share this link'
              : ''}
        </span>
      </button>

      {menuOpen && (
        <div
          role="menu"
          aria-label="Share storefront"
          className="absolute top-full right-0 z-50 mt-1.5 w-36 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-lg"
        >
          {nativeShareAvailable && (
            <button
              ref={firstActionRef}
              type="button"
              role="menuitem"
              className="flex h-10 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm font-medium transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:opacity-50"
              onClick={shareNatively}
              disabled={sharing}
            >
              <Share2 className="size-4 text-muted-foreground" />
              {sharing ? 'Opening…' : 'Share…'}
            </button>
          )}
          <button
            ref={nativeShareAvailable ? undefined : firstActionRef}
            type="button"
            role="menuitem"
            className="flex h-10 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm font-medium transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
            onClick={copyLink}
          >
            <Copy className="size-4 text-muted-foreground" />
            {copyState === 'failed' ? 'Try copying' : 'Copy link'}
          </button>
        </div>
      )}
    </div>
  )
}
