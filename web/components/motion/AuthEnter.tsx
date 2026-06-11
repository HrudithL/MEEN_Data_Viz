'use client'

import { cn } from '@/lib/utils'
import { FadeIn } from './FadeIn'

export function AuthEnter({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <FadeIn duration="slow" className={cn('animate-scale-in', className)}>
      {children}
    </FadeIn>
  )
}
