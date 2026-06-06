import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/utils'
import { PHASE_IDS } from '@/lib/constants'
import type { PhaseArtifactBreakdown } from '@/components/builds/BuildOverviewVisuals'

// GET /api/builds/[buildId]/overview
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ buildId: string }> }
) {
  const { buildId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return apiError('UNAUTHORIZED', 'Not authenticated', 401)

  const { data: build, error: buildError } = await supabase
    .from('builds')
    .select('id, organization_id, status')
    .eq('id', buildId)
    .single()

  if (buildError || !build) return apiError('NOT_FOUND', 'Build not found', 404)

  const { data: canView } = await supabase.rpc('can_view_org', { p_org_id: build.organization_id })
  if (!canView) return apiError('FORBIDDEN', 'Access denied', 403)

  const { data: phases } = await supabase
    .from('phases')
    .select('id, phase, is_complete')
    .eq('build_id', buildId)

  const phaseIds = (phases ?? []).map(p => p.id)
  const artifactBreakdown: PhaseArtifactBreakdown[] = PHASE_IDS.map(id => ({
    phaseId: id,
    total: 0,
    byType: {},
  }))

  if (phaseIds.length > 0) {
    const { data: artifacts } = await supabase
      .from('artifacts')
      .select('file_type, phases!inner(phase)')
      .in('phase_id', phaseIds)

    for (const art of artifacts ?? []) {
      const phaseKey = (art.phases as { phase?: string })?.phase
      if (!phaseKey) continue
      const row = artifactBreakdown.find(p => p.phaseId === phaseKey)
      if (!row) continue
      const fileType = art.file_type as string
      row.byType[fileType] = (row.byType[fileType] ?? 0) + 1
      row.total++
    }
  }

  const phaseCompletion: Record<string, boolean> = {}
  for (const phase of phases ?? []) {
    phaseCompletion[phase.phase] = phase.is_complete
  }

  const completedPhases = (phases ?? []).filter(p => p.is_complete).length

  return Response.json({
    data: {
      artifactBreakdown,
      phaseCompletion,
      completedPhases,
      totalPhases: PHASE_IDS.length,
      status: build.status,
    },
  })
}
