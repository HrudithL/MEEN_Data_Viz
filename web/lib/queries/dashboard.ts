import { createClient } from '@/lib/supabase/server'
import { PHASE_IDS } from '@/lib/constants'
import type { DashboardStats } from '@/types/api'

export async function getDashboardStats(orgId: string): Promise<DashboardStats | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: canView } = await supabase.rpc('can_view_org', { p_org_id: orgId })
  if (!canView) return null

  const { data: builds, error: buildsError } = await supabase
    .from('builds')
    .select('id, status')
    .eq('organization_id', orgId)

  if (buildsError) return null

  const totalBuilds = builds?.length ?? 0
  const completeBuilds = builds?.filter((b) => b.status === 'complete').length ?? 0
  const inProgressBuilds = totalBuilds - completeBuilds

  const buildIds = (builds ?? []).map((b) => b.id)
  const phasesCompleted: number[] = new Array(PHASE_IDS.length).fill(0)

  if (buildIds.length > 0) {
    const { data: phases } = await supabase
      .from('phases')
      .select('phase, is_complete')
      .in('build_id', buildIds)
      .eq('is_complete', true)

    for (const phase of phases ?? []) {
      const idx = PHASE_IDS.indexOf(phase.phase as (typeof PHASE_IDS)[number])
      if (idx !== -1) phasesCompleted[idx]++
    }
  }

  const { data: recentArtifacts } = await supabase
    .from('artifacts')
    .select(`
      *,
      phases!inner(phase, build_id, builds!inner(name, organization_id))
    `)
    .eq('phases.builds.organization_id', orgId)
    .order('uploaded_at', { ascending: false })
    .limit(10)

  const formatted = (recentArtifacts ?? []).map((a) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = a as any
    return {
      ...row,
      phaseName: row.phases?.phase ?? null,
      buildName: row.phases?.builds?.name ?? null,
      phases: undefined,
    }
  })

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const { data: recentUploads } = await supabase
    .from('artifacts')
    .select('uploaded_at, phases!inner(builds!inner(organization_id))')
    .eq('phases.builds.organization_id', orgId)
    .gte('uploaded_at', fourteenDaysAgo)

  const dayCounts = new Map<string, number>()
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dayCounts.set(d.toISOString().slice(0, 10), 0)
  }
  for (const u of recentUploads ?? []) {
    const day = (u.uploaded_at as string).slice(0, 10)
    if (dayCounts.has(day)) dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1)
  }
  const uploadsByDay = Array.from(dayCounts.entries()).map(([date, count]) => ({ date, count }))

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { count: totalArtifacts } = await supabase
    .from('artifacts')
    .select('id, phases!inner(builds!inner(organization_id))', { count: 'exact', head: true })
    .eq('phases.builds.organization_id', orgId)

  const { count: artifactsThisWeek } = await supabase
    .from('artifacts')
    .select('id, phases!inner(builds!inner(organization_id))', { count: 'exact', head: true })
    .eq('phases.builds.organization_id', orgId)
    .gte('uploaded_at', weekAgo)

  const { data: buildsDetail } = await supabase
    .from('builds')
    .select('id, name, status, created_at, phases(is_complete, artifacts(id))')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(5)

  const recentBuilds = (buildsDetail ?? []).map(row => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const phases = (row as any).phases as { is_complete: boolean; artifacts: { id: string }[] }[]
    const completedPhases = (phases ?? []).filter(p => p.is_complete).length
    const artifactCount = (phases ?? []).reduce((sum, p) => sum + (p.artifacts?.length ?? 0), 0)
    const { phases: _p, ...build } = row as typeof row & { phases?: unknown }
    return { ...build, completedPhases, artifactCount }
  })

  return {
    totalBuilds,
    completeBuilds,
    inProgressBuilds,
    phasesCompleted,
    recentArtifacts: formatted,
    uploadsByDay,
    recentBuilds,
    totalArtifacts: totalArtifacts ?? 0,
    artifactsThisWeek: artifactsThisWeek ?? 0,
  }
}
