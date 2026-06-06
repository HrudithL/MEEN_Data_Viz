'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'
import { PhaseCompareResults } from '@/components/viz/PhaseCompareResults'
import { CompareFilters, type CompareFilterValues } from '@/components/viz/CompareFilters'
import { PHASE_IDS } from '@/lib/constants'
import type { VizManifest } from '@/types/api'

export default function PhaseComparePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const buildId = params?.buildId as string

  const selectedPhaseIds = useMemo(() => {
    const raw = searchParams.get('phases') ?? ''
    const ids = raw.split(',').filter(Boolean)
    return PHASE_IDS.filter(id => ids.includes(id))
  }, [searchParams])

  const [manifest, setManifest] = useState<VizManifest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState<CompareFilterValues>({
    label: '',
    shieldGas: '',
    heatTreatment: '',
    processParameters: '',
  })

  const fetchManifest = useCallback(
    async (currentFilters: CompareFilterValues) => {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({ mode: 'compare' })
        if (currentFilters.shieldGas) params.set('shield_gas', currentFilters.shieldGas)
        if (currentFilters.heatTreatment) params.set('heat_treatment', currentFilters.heatTreatment)
        if (currentFilters.processParameters) params.set('process_parameters', currentFilters.processParameters)

        const res = await fetch(`/api/builds/${buildId}/visualizations?${params}`, {
          cache: 'no-store',
        })
        if (!res.ok) throw new Error('Failed to load comparison data')
        const json = await res.json()
        setManifest(json.data ?? null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading comparison')
      } finally {
        setLoading(false)
      }
    },
    [buildId]
  )

  useEffect(() => {
    if (buildId && selectedPhaseIds.length >= 2) fetchManifest(filters)
    else setLoading(false)
  }, [buildId, selectedPhaseIds.length])

  function handleFiltersApply(newFilters: CompareFilterValues) {
    setFilters(newFilters)
    fetchManifest(newFilters)
  }

  if (selectedPhaseIds.length < 2) {
    return (
      <div className="p-6 max-w-7xl mx-auto text-center text-muted-foreground">
        <p>Select at least 2 phases from the Compare tab to view a comparison.</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {manifest && (
        <CompareFilters
          distinctLabels={manifest.distinctLabels}
          metadataOptions={manifest.metadataOptions}
          onApply={handleFiltersApply}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-destructive">{error}</p>
        </div>
      ) : manifest ? (
        <PhaseCompareResults
          buildId={buildId}
          manifest={manifest}
          selectedPhaseIds={selectedPhaseIds}
        />
      ) : null}
    </div>
  )
}
