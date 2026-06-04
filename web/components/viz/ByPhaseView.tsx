'use client'

import { PHASE_IDS } from '@/lib/constants'
import { VizPhasePanel } from './PhasePanel'
import type { VizManifest } from '@/types/api'
import type { PhaseIdEnum } from '@/types/database'

interface ByPhaseViewProps {
  manifest: VizManifest
}

export function ByPhaseView({ manifest }: ByPhaseViewProps) {
  const phaseMap = Object.fromEntries(
    manifest.phases.map(p => [p.phaseName, p])
  )

  // Also try matching by sequence
  const sortedPhases = [...manifest.phases].sort((a, b) => a.sequence - b.sequence)

  return (
    <div className="space-y-3">
      {PHASE_IDS.map((phaseKey, index) => {
        const vizPhase = sortedPhases[index] ?? null
        if (!vizPhase) return null

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
