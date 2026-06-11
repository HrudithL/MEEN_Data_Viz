'use client'

import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CollapsibleHeaderProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  open: boolean
  children: React.ReactNode
}

export function CollapsibleHeader({
  open,
  children,
  className,
  ...props
}: CollapsibleHeaderProps) {
  return (
    <button
      type="button"
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 bg-card',
        'interactive-surface text-left',
        className
      )}
      {...props}
    >
      <ChevronRight
        className={cn(
          'h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ease-out',
          open && 'rotate-90'
        )}
      />
      {children}
    </button>
  )
}
