'use client'

import { Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

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

export function CopyList({
  title,
  description,
  value,
  className,
  children,
}: {
  title: string
  description: string
  value: string
  className?: string
  children: React.ReactNode
}) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>(
    'idle',
  )
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current)
    },
    [],
  )

  async function handleCopy() {
    try {
      await copyPlainText(value)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }

    if (resetTimer.current) clearTimeout(resetTimer.current)
    resetTimer.current = setTimeout(() => setCopyState('idle'), 2_000)
  }

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="grid-cols-[1fr_auto]">
        <div>
          <CardTitle className="font-display text-xl">{title}</CardTitle>
          <CardDescription className="mt-1 leading-relaxed">
            {description}
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          aria-label={`Copy ${title.toLowerCase()}`}
        >
          {copyState === 'copied' ? <Check /> : <Copy />}
          {copyState === 'copied'
            ? 'Copied'
            : copyState === 'failed'
              ? 'Try again'
              : 'Copy'}
        </Button>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
