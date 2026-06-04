import type { SupabaseClient } from '@supabase/supabase-js'
import { PHASE_IDS } from '@/lib/constants'

export async function recomputeBuildStatus(
  supabase: SupabaseClient,
  buildId: string
): Promise<void> {
  // Fetch all phases for this build with their artifact counts
  const { data: phases, error } = await supabase
    .from('phases')
    .select('id, phase, is_complete')
    .eq('build_id', buildId)

  if (error || !phases) return

  // For each phase check if it has ≥1 artifact with parse_status in ('ok', 'partial')
  const phaseIds = phases.map((p) => p.id)

  const { data: artifacts } = await supabase
    .from('artifacts')
    .select('phase_id, parse_status')
    .in('phase_id', phaseIds)
    .in('parse_status', ['ok', 'partial'])

  const phaseHasArtifact = new Set((artifacts ?? []).map((a) => a.phase_id))

  // Update each phase's is_complete
  for (const phase of phases) {
    const isComplete = phaseHasArtifact.has(phase.id)
    if (isComplete !== phase.is_complete) {
      await supabase
        .from('phases')
        .update({ is_complete: isComplete })
        .eq('id', phase.id)
    }
  }

  // Build is complete only if all 9 phases have ≥1 qualifying artifact
  const allComplete = phases.length === PHASE_IDS.length &&
    phases.every((p) => phaseHasArtifact.has(p.id))

  await supabase
    .from('builds')
    .update({ status: allComplete ? 'complete' : 'in_progress' })
    .eq('id', buildId)
}
