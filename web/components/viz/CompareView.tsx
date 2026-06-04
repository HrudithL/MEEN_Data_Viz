'use client'

import { PHASE_IDS, PHASE_DISPLAY } from '@/lib/constants'
import { PhaseCell } from './PhaseCell'
import type { VizManifest, VizPhase } from '@/types/api'
import type { PhaseIdEnum } from '@/types/database'

interface CompareViewProps {
  manifest: VizManifest
}

export function CompareView({ manifest }: CompareViewProps) {
  const phaseByKey = new Map<string, VizPhase>(
    manifest.phases.map(p => [p.phaseId, p])
  )

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {PHASE_IDS.map((phaseKey) => {
        const vizPhase = phaseByKey.get(phaseKey)

        if (!vizPhase) {
          // Phase not yet initialized in DB — show empty placeholder cell
          return (
            <div key={phaseKey} className="border rounded-lg p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                {PHASE_DISPLAY[phaseKey as PhaseIdEnum]}
              </p>
              <p className="text-xs text-muted-foreground">No data yet</p>
            </div>
          )
        }

        return (
          <PhaseCell
            key={phaseKey}
            vizPhase={vizPhase}
            phaseKey={phaseKey as PhaseIdEnum}
          />
        )
      })}
    </div>
  )
}
