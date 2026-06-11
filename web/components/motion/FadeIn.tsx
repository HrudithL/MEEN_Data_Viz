'use client'

import { cn } from '@/lib/utils'
import { useReducedMotion } from './useReducedMotion'

interface FadeInProps {
  children: React.ReactNode
  className?: string
  delay?: number
  duration?: 'fast' | 'normal' | 'slow'
}

const durationMap = {
  fast: 'duration-200',
  normal: 'duration-300',
  slow: 'duration-500',
}

export function FadeIn({
  children,
  className,
  delay = 0,
  duration = 'normal',
}: FadeInProps) {
  const reduced = useReducedMotion()

  return (
    <div
      className={cn(
        !reduced && 'animate-fade-in opacity-0 [animation-fill-mode:forwards]',
        !reduced && durationMap[duration],
        className
      )}
      style={reduced ? undefined : { animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}
