'use client'

import { cn } from '@/lib/utils'

type VizMode = 'by_phase' | 'compare'

interface ModeToggleProps {
  mode: VizMode
  onChange: (mode: VizMode) => void
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="inline-flex rounded-md border border-border p-0.5 bg-muted">
      {(['by_phase', 'compare'] as const).map(m => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cn(
            'px-4 py-1.5 text-sm font-medium rounded transition-all duration-200 ease-snappy interactive active:scale-[0.97]',
            mode === m
              ? 'bg-background text-foreground shadow-sm scale-[1.02]'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
          )}
        >
          {m === 'by_phase' ? 'By Phase' : 'Compare'}
        </button>
      ))}
    </div>
  )
}
