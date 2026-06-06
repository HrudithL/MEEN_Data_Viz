'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PhaseCell } from './PhaseCell'
import { PHASE_DISPLAY } from '@/lib/constants'
import type { VizManifest, VizPhase } from '@/types/api'
import type { PhaseIdEnum } from '@/types/database'
import { cn } from '@/lib/utils'

interface PhaseCompareResultsProps {
  buildId: string
  manifest: VizManifest
  selectedPhaseIds: string[]
}

function gridClass(count: number): string {
  if (count <= 2) return 'grid-cols-1 xl:grid-cols-2'
  return 'grid-cols-1 xl:grid-cols-2'
}

function cellScaleClass(count: number): string {
  if (count <= 2) return 'min-h-[640px]'
  return 'min-h-[520px]'
}

export function PhaseCompareResults({
  buildId,
  manifest,
  selectedPhaseIds,
}: PhaseCompareResultsProps) {
  const phaseByKey = new Map<string, VizPhase>(
    (manifest.phases ?? []).map(p => [p.phaseId, p])
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" render={<Link href={`/builds/${buildId}/visualizations`} />}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div>
          <h2 className="text-lg font-semibold">Phase Comparison</h2>
          <p className="text-sm text-muted-foreground">
            Comparing {selectedPhaseIds.length} phases side by side
          </p>
        </div>
      </div>

      <div className={cn('grid gap-6', gridClass(selectedPhaseIds.length))}>
        {selectedPhaseIds.map(phaseKey => {
          const vizPhase = phaseByKey.get(phaseKey)

          if (!vizPhase) {
            return (
              <div
                key={phaseKey}
                className={cn('border rounded-lg p-6', cellScaleClass(selectedPhaseIds.length))}
              >
                <p className="text-sm font-semibold text-muted-foreground mb-2">
                  {PHASE_DISPLAY[phaseKey as PhaseIdEnum]}
                </p>
                <p className="text-sm text-muted-foreground">No data yet</p>
              </div>
            )
          }

          return (
            <div key={phaseKey} className={cellScaleClass(selectedPhaseIds.length)}>
              <PhaseCell
                vizPhase={vizPhase}
                phaseKey={phaseKey as PhaseIdEnum}
                compareMode
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
