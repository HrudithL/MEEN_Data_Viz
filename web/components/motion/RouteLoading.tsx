'use client'

import { cn } from '@/lib/utils'
import { FuturisticLoader } from './FuturisticLoader'

interface RouteLoadingProps {
  label?: string
  /** page = full content area; inline = compact for nested segments */
  variant?: 'page' | 'inline' | 'minimal'
  className?: string
}

export function RouteLoading({
  label = 'Loading…',
  variant = 'page',
  className,
}: RouteLoadingProps) {
  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <FuturisticLoader size="md" label={label} />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center w-full animate-fade-in',
        variant === 'page' ? 'min-h-[min(70vh,640px)] p-8' : 'min-h-[280px] p-6',
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative">
        <div
          className="absolute -inset-12 rounded-full opacity-30 blur-2xl gradient-coral animate-pulse-glow pointer-events-none"
          aria-hidden
        />
        <FuturisticLoader size="lg" label={label} />
      </div>

      <div
        className={cn(
          'mt-10 w-full space-y-3',
          variant === 'page' ? 'max-w-lg' : 'max-w-md'
        )}
        aria-hidden
      >
        <div className="h-3 skeleton-shimmer rounded-md w-[72%]" />
        <div className="h-3 skeleton-shimmer rounded-md w-full [animation-delay:120ms]" />
        <div className="h-3 skeleton-shimmer rounded-md w-[88%] [animation-delay:240ms]" />
        {variant === 'page' && (
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="h-20 skeleton-shimmer rounded-xl [animation-delay:80ms]" />
            <div className="h-20 skeleton-shimmer rounded-xl [animation-delay:160ms]" />
            <div className="h-20 skeleton-shimmer rounded-xl [animation-delay:240ms]" />
          </div>
        )}
      </div>
    </div>
  )
}
