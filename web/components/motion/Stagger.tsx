'use client'

import { Children, isValidElement } from 'react'
import { useReducedMotion } from './useReducedMotion'

interface StaggerProps {
  children: React.ReactNode
  className?: string
  staggerMs?: number
  baseDelayMs?: number
}

export function Stagger({
  children,
  className,
  staggerMs = 60,
  baseDelayMs = 0,
}: StaggerProps) {
  const reduced = useReducedMotion()
  const items = Children.toArray(children)

  return (
    <div className={className}>
      {items.map((child, i) => {
        if (!isValidElement(child)) return child
        if (reduced) return child

        return (
          <div
            key={child.key ?? i}
            className="animate-slide-up opacity-0 [animation-fill-mode:forwards]"
            style={{ animationDelay: `${baseDelayMs + i * staggerMs}ms` }}
          >
            {child}
          </div>
        )
      })}
    </div>
  )
}
