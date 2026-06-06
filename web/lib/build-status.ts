import type { SupabaseClient } from '@supabase/supabase-js'
import { PHASE_IDS, PHASE_ACCEPTED_TYPES, type PhaseId } from '@/lib/constants'

export async function recomputeBuildStatus(
  supabase: SupabaseClient,
  buildId: string
): Promise<void> {
  const { data: phases, error } = await supabase
    .from('phases')
    .select('id, phase, is_complete')
    .eq('build_id', buildId)

  if (error || !phases) return

  const phaseIds = phases.map(p => p.id)

  const { data: artifacts } = await supabase
    .from('artifacts')
    .select('phase_id, file_type')
    .in('phase_id', phaseIds)

  const phaseHasRequiredType = new Set<string>()

  for (const phase of phases) {
    const accepted = PHASE_ACCEPTED_TYPES[phase.phase as PhaseId] ?? []
    const hasMatch = (artifacts ?? []).some(
      a => a.phase_id === phase.id && accepted.includes(a.file_type)
    )
    if (hasMatch) phaseHasRequiredType.add(phase.id)
  }

  for (const phase of phases) {
    const isComplete = phaseHasRequiredType.has(phase.id)
    if (isComplete !== phase.is_complete) {
      await supabase
        .from('phases')
        .update({ is_complete: isComplete })
        .eq('id', phase.id)
    }
  }

  const allComplete =
    phases.length === PHASE_IDS.length &&
    phases.every(p => phaseHasRequiredType.has(p.id))

  await supabase
    .from('builds')
    .update({ status: allComplete ? 'complete' : 'in_progress' })
    .eq('id', buildId)
}
