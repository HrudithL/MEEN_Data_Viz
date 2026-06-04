'use client'

import { PHASE_IDS } from '@/lib/constants'
import { PhaseCell } from './PhaseCell'
import type { VizManifest } from '@/types/api'
import type { PhaseIdEnum } from '@/types/database'

interface CompareViewProps {
  manifest: VizManifest
}

export function CompareView({ manifest }: CompareViewProps) {
  const sortedPhases = [...manifest.phases].sort((a, b) => a.sequence - b.sequence)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {PHASE_IDS.map((phaseKey, index) => {
        const vizPhase = sortedPhases[index]
        if (!vizPhase) return null

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
