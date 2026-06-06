import { createClient } from '@/lib/supabase/server'
import { PHASE_IDS } from '@/lib/constants'
import type { BuildWithPhases } from '@/types/api'
import type { Build } from '@/types/database'

export async function getBuildWithPhases(buildId: string): Promise<BuildWithPhases | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: build, error } = await supabase
    .from('builds')
    .select('*')
    .eq('id', buildId)
    .single()

  if (error || !build) return null

  const { data: canView } = await supabase.rpc('can_view_org', {
    p_org_id: build.organization_id,
  })
  if (!canView) return null

  const { data: phases } = await supabase
    .from('phases')
    .select('*')
    .eq('build_id', buildId)
    .order('sequence', { ascending: true })

  const completedPhases = (phases ?? []).filter((p) => p.is_complete).length

  return { ...build, phases: phases ?? [], completedPhases }
}

export type BuildWithProgress = Build & {
  completedPhases: number
  phaseCompletion: boolean[]
}

export async function getBuildsForOrg(orgId: string): Promise<BuildWithProgress[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: canView } = await supabase.rpc('can_view_org', { p_org_id: orgId })
  if (!canView) return []

  const { data, error } = await supabase
    .from('builds')
    .select('*, phases(phase, is_complete, sequence)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  if (error) return []

  return (data ?? []).map((row) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const phases = (row as any).phases as { phase: string; is_complete: boolean; sequence: number }[] | undefined
    const sorted = [...(phases ?? [])].sort((a, b) => a.sequence - b.sequence)
    const phaseCompletion = PHASE_IDS.map(
      id => sorted.find(p => p.phase === id)?.is_complete ?? false
    )
    const completedPhases = phaseCompletion.filter(Boolean).length
    const { phases: _p, ...build } = row as Build & { phases?: unknown }
    return { ...build, completedPhases, phaseCompletion }
  })
}
