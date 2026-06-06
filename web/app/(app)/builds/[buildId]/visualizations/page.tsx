'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'
import { ModeToggle } from '@/components/viz/ModeToggle'
import { CompareFilters, type CompareFilterValues } from '@/components/viz/CompareFilters'
import { ByPhaseView } from '@/components/viz/ByPhaseView'
import { CompareView } from '@/components/viz/CompareView'
import type { VizManifest } from '@/types/api'

type VizMode = 'by_phase' | 'compare'

export default function VisualizationsPage() {
  const params = useParams()
  const buildId = params?.buildId as string

  const [mode, setMode] = useState<VizMode>('by_phase')
  const [manifest, setManifest] = useState<VizManifest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState<CompareFilterValues>({
    label: '',
    shieldGas: '',
    heatTreatment: '',
    processParameters: '',
  })

  const fetchManifest = useCallback(async (currentMode: VizMode, currentFilters: CompareFilterValues) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ mode: currentMode })
      if (currentFilters.label) params.set('label', currentFilters.label)
      if (currentFilters.shieldGas) params.set('shield_gas', currentFilters.shieldGas)
      if (currentFilters.heatTreatment) params.set('heat_treatment', currentFilters.heatTreatment)
      if (currentFilters.processParameters) params.set('process_parameters', currentFilters.processParameters)

      const res = await fetch(`/api/builds/${buildId}/visualizations?${params}`, {
        cache: 'no-store',
      })
      if (!res.ok) throw new Error('Failed to load visualization data')
      const json = await res.json()
      setManifest(json.data ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading visualizations')
    } finally {
      setLoading(false)
    }
  }, [buildId])

  useEffect(() => {
    if (buildId) fetchManifest(mode, filters)
  }, [buildId, mode])

  function handleModeChange(newMode: VizMode) {
    setMode(newMode)
  }

  function handleFiltersApply(newFilters: CompareFilterValues) {
    setFilters(newFilters)
    fetchManifest(mode, newFilters)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-lg font-semibold">Visualizations</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Explore experimental data across all build phases
          </p>
        </div>
        <ModeToggle mode={mode} onChange={handleModeChange} />
      </div>

      {/* Compare filters */}
      {mode === 'compare' && manifest && (
        <CompareFilters
          distinctLabels={manifest.distinctLabels}
          metadataOptions={manifest.metadataOptions}
          onApply={handleFiltersApply}
        />
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading visualizations...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="flex flex-col items-center gap-3 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Failed to load</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
            <button
              onClick={() => fetchManifest(mode, filters)}
              className="text-sm text-primary underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        </div>
      ) : manifest ? (
        mode === 'by_phase' ? (
          <ByPhaseView manifest={manifest} />
        ) : (
          <CompareView />
        )
      ) : null}
    </div>
  )
}
