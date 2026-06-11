'use client'

import { cn } from '@/lib/utils'
import { useReducedMotion } from './useReducedMotion'

interface AnimatedCollapsibleProps {
  open: boolean
  children: React.ReactNode
  className?: string
  contentClassName?: string
}

export function AnimatedCollapsible({
  open,
  children,
  className,
  contentClassName,
}: AnimatedCollapsibleProps) {
  const reduced = useReducedMotion()

  if (reduced) {
    return open ? <div className={className}>{children}</div> : null
  }

  return (
    <div
      className={cn(
        'grid transition-[grid-template-rows,opacity] duration-300 ease-out',
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        className
      )}
    >
      <div className="overflow-hidden min-h-0">
        <div
          className={cn(
            open && 'animate-slide-up',
            contentClassName
          )}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
