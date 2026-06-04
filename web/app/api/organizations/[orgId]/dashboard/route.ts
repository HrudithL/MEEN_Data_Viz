import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/utils'
import { PHASE_IDS } from '@/lib/constants'

// GET /api/organizations/[orgId]/dashboard
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return apiError('UNAUTHORIZED', 'Not authenticated', 401)

  const { data: canView } = await supabase.rpc('can_view_org', { p_org_id: orgId })
  if (!canView) return apiError('FORBIDDEN', 'Access denied', 403)

  const { data: builds, error: buildsError } = await supabase
    .from('builds')
    .select('id, status')
    .eq('organization_id', orgId)

  if (buildsError) return apiError('DB_ERROR', buildsError.message, 500)

  const totalBuilds = builds?.length ?? 0
  const completeBuilds = builds?.filter((b) => b.status === 'complete').length ?? 0
  const inProgressBuilds = totalBuilds - completeBuilds

  // Count completed phases per phase sequence across all builds
  const buildIds = (builds ?? []).map((b) => b.id)
  const phasesCompleted: number[] = new Array(PHASE_IDS.length).fill(0)

  if (buildIds.length > 0) {
    const { data: phases } = await supabase
      .from('phases')
      .select('phase, is_complete')
      .in('build_id', buildIds)
      .eq('is_complete', true)

    for (const phase of phases ?? []) {
      const idx = PHASE_IDS.indexOf(phase.phase as typeof PHASE_IDS[number])
      if (idx !== -1) phasesCompleted[idx]++
    }
  }

  // Recent artifacts (last 10)
  const { data: recentArtifacts } = await supabase
    .from('artifacts')
    .select(`
      *,
      phases!inner(phase, build_id, builds!inner(name, organization_id))
    `)
    .eq('phases.builds.organization_id', orgId)
    .order('uploaded_at', { ascending: false })
    .limit(10)

  const formatted = (recentArtifacts ?? []).map((a: any) => ({
    ...a,
    phaseName: a.phases?.phase ?? null,
    buildName: a.phases?.builds?.name ?? null,
    phases: undefined,
  }))

  return Response.json({
    data: {
      totalBuilds,
      completeBuilds,
      inProgressBuilds,
      phasesCompleted,
      recentArtifacts: formatted,
    },
  })
}
