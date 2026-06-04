'use client'

import { PHASE_IDS, PHASE_DISPLAY } from '@/lib/constants'
import { VizPhasePanel } from './PhasePanel'
import type { VizManifest, VizPhase } from '@/types/api'
import type { PhaseIdEnum } from '@/types/database'

interface ByPhaseViewProps {
  manifest: VizManifest
}

export function ByPhaseView({ manifest }: ByPhaseViewProps) {
  const phaseByKey = new Map<string, VizPhase>(
    manifest.phases.map(p => [p.phaseId, p])
  )

  return (
    <div className="space-y-3">
      {PHASE_IDS.map((phaseKey, index) => {
        const vizPhase = phaseByKey.get(phaseKey)

        if (!vizPhase) {
          return (
            <div key={phaseKey} className="border rounded-lg px-4 py-3 flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                {PHASE_DISPLAY[phaseKey as PhaseIdEnum]}
              </span>
              <span className="text-xs text-muted-foreground ml-auto">No data yet</span>
            </div>
          )
        }

        return (
          <VizPhasePanel
            key={phaseKey}
            vizPhase={vizPhase}
            phaseKey={phaseKey as PhaseIdEnum}
            defaultOpen={index === 0}
          />
        )
      })}
    </div>
  )
}
