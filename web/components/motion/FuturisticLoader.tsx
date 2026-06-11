'use client'

import { cn } from '@/lib/utils'

interface FuturisticLoaderProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  label?: string
}

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
}

export function FuturisticLoader({ size = 'md', className, label }: FuturisticLoaderProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2', className)} role="status">
      <div className={cn('relative', sizeMap[size])}>
        <div
          className={cn(
            'absolute inset-0 rounded-full border-2 border-primary/20',
            sizeMap[size]
          )}
        />
        <div
          className={cn(
            'absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin',
            'shadow-[0_0_12px_hsl(var(--coral-start)/0.35)]',
            sizeMap[size]
          )}
        />
        <div
          className={cn(
            'absolute inset-[3px] rounded-full bg-primary/10 animate-pulse-glow',
            size === 'sm' && 'inset-[2px]',
            size === 'lg' && 'inset-[4px]'
          )}
        />
      </div>
      {label && (
        <span className="text-xs text-muted-foreground animate-pulse">{label}</span>
      )}
      <span className="sr-only">Loading</span>
    </div>
  )
}
