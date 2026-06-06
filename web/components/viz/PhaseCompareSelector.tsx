'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PHASE_IDS, PHASE_DISPLAY } from '@/lib/constants'
import type { PhaseIdEnum } from '@/types/database'

interface PhaseCompareSelectorProps {
  buildId: string
}

const MIN_PHASES = 2
const MAX_PHASES = 4

export function PhaseCompareSelector({ buildId }: PhaseCompareSelectorProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function togglePhase(phaseId: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(phaseId)) {
        next.delete(phaseId)
      } else if (next.size < MAX_PHASES) {
        next.add(phaseId)
      }
      return next
    })
  }

  function handleCompare() {
    if (selected.size < MIN_PHASES) return
    const ordered = PHASE_IDS.filter(id => selected.has(id))
    const params = new URLSearchParams({ phases: ordered.join(',') })
    router.push(`/builds/${buildId}/visualizations/compare?${params}`)
  }

  const count = selected.size
  const canCompare = count >= MIN_PHASES && count <= MAX_PHASES

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">
          Select {MIN_PHASES}–{MAX_PHASES} phases to compare side by side. All artifact labels are shown.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {count} selected {count > 0 && count < MIN_PHASES && `(need at least ${MIN_PHASES})`}
          {count >= MAX_PHASES && '(maximum reached)'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {PHASE_IDS.map(phaseId => {
          const isSelected = selected.has(phaseId)
          const disabled = !isSelected && count >= MAX_PHASES
          return (
            <button
              key={phaseId}
              type="button"
              disabled={disabled}
              onClick={() => togglePhase(phaseId)}
              className={cn(
                'text-left px-3 py-2.5 rounded-lg border text-sm transition-colors',
                isSelected
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border hover:bg-muted/50',
                disabled && 'opacity-40 cursor-not-allowed'
              )}
            >
              {PHASE_DISPLAY[phaseId as PhaseIdEnum]}
            </button>
          )
        })}
      </div>

      <Button onClick={handleCompare} disabled={!canCompare}>
        Compare {count >= MIN_PHASES ? `${count} Phases` : 'Phases'}
      </Button>
    </div>
  )
}
