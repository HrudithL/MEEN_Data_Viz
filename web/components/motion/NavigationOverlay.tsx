'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Atom } from 'lucide-react'
import type { NavigationDisplay } from './navigationMessages'

interface NavigationOverlayProps {
  open: boolean
  display: NavigationDisplay
  progress: number
}

export function NavigationOverlay({ open, display, progress }: NavigationOverlayProps) {
  const [mounted, setMounted] = useState(false)
  const [statusIndex, setStatusIndex] = useState(0)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) {
      setStatusIndex(0)
      return
    }
    const interval = setInterval(() => {
      setStatusIndex(i => (i + 1) % display.statusMessages.length)
    }, 2200)
    return () => clearInterval(interval)
  }, [open, display.statusMessages.length])

  if (!mounted || !open) return null

  const statusText = display.statusMessages[statusIndex] ?? display.statusMessages[0]

  return createPortal(
    <div
      className="nav-loading-root"
      role="dialog"
      aria-modal="true"
      aria-busy="true"
      aria-label={`Navigating to ${display.destination}`}
    >
      <div className="nav-loading-backdrop" aria-hidden />

      <div className="absolute top-0 left-0 right-0 h-[2px] bg-border/30 overflow-hidden" aria-hidden>
        <div
          className="h-full gradient-coral transition-[width] duration-300 ease-snappy shadow-[0_0_12px_hsl(var(--coral-start)/0.45)]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Flex centering — animation on inner card only (no transform conflict) */}
      <div className="nav-loading-center">
        <div className="nav-loading-card-enter w-full max-w-[26rem] px-4">
          <div className="nav-loading-card rounded-2xl border border-border/50 px-8 py-9 text-center shadow-2xl">
            <div className="relative mx-auto mb-8 h-24 w-24" aria-hidden>
              <div className="nav-orbit-ring nav-orbit-ring-a" />
              <div className="nav-orbit-ring nav-orbit-ring-b" />
              <div className="nav-orbit-ring nav-orbit-ring-c" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="nav-orbit-core flex h-11 w-11 items-center justify-center rounded-xl icon-box-coral">
                  <Atom className="h-5 w-5 text-primary" />
                </div>
              </div>
            </div>

            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80 mb-2">
              Navigating to
            </p>

            <h2 className="text-2xl font-bold tracking-tight gradient-text mb-1">
              {display.destination}
            </h2>

            <p className="text-base font-medium text-foreground/90 mb-1">
              {display.headline}
            </p>

            <p className="text-sm text-muted-foreground leading-relaxed mb-6 px-1">
              {display.tagline}
            </p>

            <div className="flex items-center justify-center gap-2 min-h-[1.25rem]">
              <span className="nav-status-dot" />
              <p
                key={statusText}
                className="text-xs font-medium text-primary/90 animate-fade-in tabular-nums"
              >
                {statusText}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
