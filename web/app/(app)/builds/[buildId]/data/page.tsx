'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { PhasePanel } from '@/components/data/PhasePanel'
import { ReferenceMaterialPanel } from '@/components/data/ReferenceMaterialPanel'
import { PHASE_IDS } from '@/lib/constants'
import type { BuildWithPhases } from '@/types/api'
import type { PhaseWithArtifacts } from '@/types/api'
import type { OrgWithRole } from '@/types/api'

type PhaseWithArtifactsAndNotes = PhaseWithArtifacts & {
  notes_json: unknown
  phase: string
  is_complete: boolean
}

export default function DataPage() {
  const params = useParams()
  const buildId = params?.buildId as string

  const [build, setBuild] = useState<BuildWithPhases | null>(null)
  const [phases, setPhases] = useState<PhaseWithArtifactsAndNotes[]>([])
  const [orgRole, setOrgRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadData() {
    setLoading(true)
    try {
      const [buildRes, phasesRes] = await Promise.all([
        fetch(`/api/builds/${buildId}`, { cache: 'no-store' }),
        fetch(`/api/builds/${buildId}/phases`, { cache: 'no-store' }),
      ])

      if (!buildRes.ok) throw new Error('Failed to load build')
      const buildJson = await buildRes.json()
      const phasesJson = phasesRes.ok ? await phasesRes.json() : { data: [] }

      setBuild(buildJson.data)
      setPhases(phasesJson.data ?? [])

      // Get user role
      const orgsRes = await fetch('/api/organizations', { cache: 'no-store' })
      if (orgsRes.ok) {
        const orgsJson = await orgsRes.json()
        const orgs: OrgWithRole[] = orgsJson.data ?? []
        const org = orgs.find(o => o.id === buildJson.data?.organization_id)
        setOrgRole(org?.role ?? null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (buildId) loadData()
  }, [buildId])

  const canEdit = orgRole === 'admin' || orgRole === 'editor'
  const orgId = build?.organization_id ?? ''

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-center text-destructive">
        <p>{error}</p>
      </div>
    )
  }

  // Sort phases by sequence
  const sortedPhases = [...phases].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Data Wizard</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Upload and manage experimental data for each phase.
          {!canEdit && ' You have read-only access.'}
        </p>
      </div>

      <ReferenceMaterialPanel buildId={buildId} orgId={orgId} canEdit={canEdit} />

      {/* Vertical stepper */}
      <div className="space-y-3">
        {PHASE_IDS.map((phaseKey, index) => {
          const phaseData = sortedPhases.find(p => p.phase === phaseKey)
          if (!phaseData) {
            return (
              <div key={phaseKey} className="border rounded-lg px-4 py-3 text-sm text-muted-foreground">
                Phase {index + 1}: {phaseKey.replace(/_/g, ' ')} — not initialized
              </div>
            )
          }
          return (
            <PhasePanel
              key={phaseData.id}
              phase={phaseData as PhaseWithArtifacts}
              phaseKey={phaseKey}
              orgId={orgId}
              buildId={buildId}
              canEdit={canEdit}
              defaultOpen={false}
            />
          )
        })}
      </div>
    </div>
  )
}
