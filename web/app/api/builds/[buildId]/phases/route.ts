import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/utils'
import { VIEWER_HINT_MAP } from '@/lib/constants'
import type { ArtifactSummary } from '@/types/api'

function toArtifactSummary(
  artifact: {
    id: string
    phase_id: string
    label: string
    file_type: string
    file_name: string
    file_size: number
    parsed_json: unknown
    parse_status: string
    metadata: unknown
    uploaded_at: string
  },
  viewerHint: string | null
): ArtifactSummary {
  return {
    id: artifact.id,
    label: artifact.label,
    fileType: artifact.file_type,
    fileName: artifact.file_name,
    fileSize: artifact.file_size,
    parsedKind: (artifact.parsed_json as { kind?: string } | null)?.kind ?? null,
    parseStatus: artifact.parse_status,
    viewerHint,
    metadata: (artifact.metadata as Record<string, unknown>) ?? {},
    uploadedAt: artifact.uploaded_at,
  }
}

// GET /api/builds/[buildId]/phases
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ buildId: string }> }
) {
  const { buildId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return apiError('UNAUTHORIZED', 'Not authenticated', 401)

  const { data: build } = await supabase
    .from('builds')
    .select('organization_id')
    .eq('id', buildId)
    .single()

  if (!build) return apiError('NOT_FOUND', 'Build not found', 404)

  const { data: canView } = await supabase.rpc('can_view_org', { p_org_id: build.organization_id })
  if (!canView) return apiError('FORBIDDEN', 'Access denied', 403)

  const { data: phases, error } = await supabase
    .from('phases')
    .select('*')
    .eq('build_id', buildId)
    .order('sequence', { ascending: true })

  if (error) return apiError('DB_ERROR', error.message, 500)

  const phaseIds = (phases ?? []).map((p) => p.id)
  let allArtifacts: Parameters<typeof toArtifactSummary>[0][] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let allSupplements: any[] = []

  if (phaseIds.length > 0) {
    const { data: artifacts } = await supabase
      .from('artifacts')
      .select('*')
      .in('phase_id', phaseIds)
      .order('uploaded_at', { ascending: true })

    const { data: supplements } = await supabase
      .from('phase_supplements')
      .select('*')
      .in('phase_id', phaseIds)
      .order('uploaded_at', { ascending: true })

    allArtifacts = (artifacts ?? []) as Parameters<typeof toArtifactSummary>[0][]
    allSupplements = supplements ?? []
  }

  const enriched = (phases ?? []).map((phase) => {
    const viewerHint = VIEWER_HINT_MAP[phase.phase] ?? null
    const artifacts = (allArtifacts ?? [])
      .filter((a) => a.phase_id === phase.id)
      .map((a) => toArtifactSummary(a, viewerHint))

    const supplements = (allSupplements ?? []).filter((s) => s.phase_id === phase.id)

    return { ...phase, artifacts, supplements }
  })

  return Response.json({ data: enriched })
}
