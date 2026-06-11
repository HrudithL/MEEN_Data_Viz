'use client'

import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useReducedMotion } from './useReducedMotion'

interface PageTransitionProps {
  children: React.ReactNode
  className?: string
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const pathname = usePathname()
  const reduced = useReducedMotion()

  return (
    <div
      key={pathname}
      className={cn(
        !reduced && 'animate-page-enter',
        className
      )}
    >
      {children}
    </div>
  )
}
