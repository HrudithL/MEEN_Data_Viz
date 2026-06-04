import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/utils'
import { PHASE_DISPLAY, VIEWER_HINT_MAP } from '@/lib/constants'
import type { VizManifest, VizPhase, ArtifactSummary } from '@/types/api'

// GET /api/builds/[buildId]/visualizations
export async function GET(
  req: NextRequest,
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

  const { searchParams } = new URL(req.url)
  const mode = (searchParams.get('mode') ?? 'by_phase') as 'by_phase' | 'compare'
  const filterLabel = searchParams.get('label')
  const filterShieldGas = searchParams.get('shield_gas')
  const filterHeatTreatment = searchParams.get('heat_treatment')
  const filterProcessParameters = searchParams.get('process_parameters')

  const { data: phases, error: phasesError } = await supabase
    .from('phases')
    .select('*')
    .eq('build_id', buildId)
    .order('sequence', { ascending: true })

  if (phasesError) return apiError('DB_ERROR', phasesError.message, 500)

  const phaseIds = (phases ?? []).map((p) => p.id)

  const { data: allArtifacts } = await supabase
    .from('artifacts')
    .select('*')
    .in('phase_id', phaseIds)
    .order('uploaded_at', { ascending: true })

  const { data: allSupplements } = await supabase
    .from('phase_supplements')
    .select('*')
    .in('phase_id', phaseIds)

  // Build sets of distinct labels and metadata values
  const distinctLabels = new Set<string>()
  const shieldGasSet = new Set<string>()
  const heatTreatmentSet = new Set<string>()
  const processParamsSet = new Set<string>()

  for (const art of allArtifacts ?? []) {
    if (art.label) distinctLabels.add(art.label)
    const meta = art.metadata as Record<string, unknown> | null
    if (meta?.shield_gas && typeof meta.shield_gas === 'string') shieldGasSet.add(meta.shield_gas)
    if (meta?.heat_treatment && typeof meta.heat_treatment === 'string') heatTreatmentSet.add(meta.heat_treatment)
    if (meta?.process_parameters && typeof meta.process_parameters === 'string') processParamsSet.add(meta.process_parameters)
  }

  const vizPhases: VizPhase[] = (phases ?? []).map((phase) => {
    let phaseArtifacts = (allArtifacts ?? []).filter((a) => a.phase_id === phase.id)

    // Apply compare mode filters
    if (mode === 'compare') {
      if (filterLabel) phaseArtifacts = phaseArtifacts.filter((a) => a.label === filterLabel)
      if (filterShieldGas) phaseArtifacts = phaseArtifacts.filter((a) => (a.metadata as any)?.shield_gas === filterShieldGas)
      if (filterHeatTreatment) phaseArtifacts = phaseArtifacts.filter((a) => (a.metadata as any)?.heat_treatment === filterHeatTreatment)
      if (filterProcessParameters) phaseArtifacts = phaseArtifacts.filter((a) => (a.metadata as any)?.process_parameters === filterProcessParameters)
    }

    const supplements = (allSupplements ?? []).filter((s) => s.phase_id === phase.id)
    const viewerHint = VIEWER_HINT_MAP[phase.phase] ?? null

    const artifactSummaries: ArtifactSummary[] = phaseArtifacts.map((a) => ({
      id: a.id,
      label: a.label,
      fileType: a.file_type,
      fileName: a.file_name,
      fileSize: a.file_size,
      parsedKind: (a.parsed_json as any)?.kind ?? null,
      parseStatus: a.parse_status,
      viewerHint,
      metadata: (a.metadata as Record<string, unknown>) ?? {},
      uploadedAt: a.uploaded_at,
    }))

    return {
      phaseId: phase.id,
      phaseName: PHASE_DISPLAY[phase.phase as keyof typeof PHASE_DISPLAY] ?? phase.phase,
      sequence: phase.sequence,
      isComplete: phase.is_complete,
      notesJson: phase.notes_json,
      supplements,
      artifacts: artifactSummaries,
    }
  })

  const manifest: VizManifest = {
    buildId,
    mode,
    phases: vizPhases,
    distinctLabels: Array.from(distinctLabels).sort(),
    metadataOptions: {
      shieldGas: Array.from(shieldGasSet).sort(),
      heatTreatment: Array.from(heatTreatmentSet).sort(),
      processParameters: Array.from(processParamsSet).sort(),
    },
  }

  return Response.json({ data: manifest })
}
