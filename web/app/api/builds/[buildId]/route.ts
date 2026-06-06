import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { apiError } from '@/lib/utils'
import { insertChangelog } from '@/lib/changelog'
import type { NotesJson } from '@/types/database'

async function getOrgIdForBuild(supabase: Awaited<ReturnType<typeof createClient>>, buildId: string) {
  const { data } = await supabase.from('builds').select('organization_id').eq('id', buildId).single()
  return data?.organization_id ?? null
}

function collectNotesStoragePaths(notesJson: unknown): string[] {
  if (!notesJson || typeof notesJson !== 'object') return []
  const notes = notesJson as NotesJson
  if (notes.format !== 'richtext_v1' || !Array.isArray(notes.blocks)) return []

  return notes.blocks.flatMap(block => {
    if ((block.type === 'file' || block.type === 'image') && block.storagePath) {
      return [block.storagePath]
    }
    return []
  })
}

async function collectBuildStoragePaths(
  serviceSb: ReturnType<typeof createServiceClient>,
  buildId: string,
  phaseIds: string[]
): Promise<string[]> {
  const paths: string[] = []

  if (phaseIds.length > 0) {
    const { data: phases } = await serviceSb
      .from('phases')
      .select('notes_json')
      .in('id', phaseIds)

    for (const phase of phases ?? []) {
      paths.push(...collectNotesStoragePaths(phase.notes_json))
    }

    const { data: artifacts } = await serviceSb
      .from('artifacts')
      .select('id, storage_path')
      .in('phase_id', phaseIds)

    const artifactIds: string[] = []
    for (const artifact of artifacts ?? []) {
      if (artifact.storage_path) paths.push(artifact.storage_path)
      artifactIds.push(artifact.id)
    }

    if (artifactIds.length > 0) {
      const { data: versions } = await serviceSb
        .from('artifact_versions')
        .select('storage_path')
        .in('artifact_id', artifactIds)

      paths.push(...(versions ?? []).map(v => v.storage_path).filter(Boolean))
    }

    const { data: supplements } = await serviceSb
      .from('phase_supplements')
      .select('storage_path')
      .in('phase_id', phaseIds)

    paths.push(...(supplements ?? []).map(s => s.storage_path).filter(Boolean))
  }

  const { data: references } = await serviceSb
    .from('build_references')
    .select('storage_path')
    .eq('build_id', buildId)

  paths.push(...(references ?? []).map(r => r.storage_path).filter(Boolean))

  return [...new Set(paths)]
}

// GET /api/builds/[buildId]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ buildId: string }> }
) {
  const { buildId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return apiError('UNAUTHORIZED', 'Not authenticated', 401)

  const { data: build, error } = await supabase
    .from('builds')
    .select('*')
    .eq('id', buildId)
    .single()

  if (error || !build) return apiError('NOT_FOUND', 'Build not found', 404)

  const { data: canView } = await supabase.rpc('can_view_org', { p_org_id: build.organization_id })
  if (!canView) return apiError('FORBIDDEN', 'Access denied', 403)

  const { data: phases } = await supabase
    .from('phases')
    .select('*')
    .eq('build_id', buildId)
    .order('sequence', { ascending: true })

  const completedPhases = (phases ?? []).filter((p) => p.is_complete).length

  return Response.json({ data: { ...build, phases: phases ?? [], completedPhases } })
}

// PATCH /api/builds/[buildId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ buildId: string }> }
) {
  const { buildId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return apiError('UNAUTHORIZED', 'Not authenticated', 401)

  const orgId = await getOrgIdForBuild(supabase, buildId)
  if (!orgId) return apiError('NOT_FOUND', 'Build not found', 404)

  const { data: canEdit } = await supabase.rpc('can_edit_org', { p_org_id: orgId })
  if (!canEdit) return apiError('FORBIDDEN', 'Editor or admin required', 403)

  const body = await req.json().catch(() => null)
  const updates: Record<string, unknown> = {}
  if (body?.name !== undefined) updates.name = body.name
  if (body?.description !== undefined) updates.description = body.description
  if (body?.material !== undefined) updates.material = body.material
  if (body?.process !== undefined) updates.process = body.process

  if (Object.keys(updates).length === 0) return apiError('NO_CHANGES', 'No fields to update')

  const { data: updated, error } = await supabase
    .from('builds')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(updates as any)
    .eq('id', buildId)
    .select()
    .single()

  if (error) return apiError('DB_ERROR', error.message, 500)

  const serviceSb = createServiceClient()
  await insertChangelog(serviceSb, {
    organizationId: orgId,
    buildId,
    userId: user.id,
    entityType: 'build',
    entityId: buildId,
    action: 'update',
    diff: updates,
  })

  return Response.json({ data: updated })
}

// DELETE /api/builds/[buildId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ buildId: string }> }
) {
  const { buildId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return apiError('UNAUTHORIZED', 'Not authenticated', 401)

  const orgId = await getOrgIdForBuild(supabase, buildId)
  if (!orgId) return apiError('NOT_FOUND', 'Build not found', 404)

  const { data: isAdmin } = await supabase.rpc('is_org_admin', { p_org_id: orgId })
  if (!isAdmin) return apiError('FORBIDDEN', 'Admin required', 403)

  const serviceSb = createServiceClient()

  // Collect storage paths for best-effort cleanup
  const { data: phases } = await serviceSb
    .from('phases')
    .select('id')
    .eq('build_id', buildId)

  const phaseIds = (phases ?? []).map((p) => p.id)
  const paths = await collectBuildStoragePaths(serviceSb, buildId, phaseIds)

  if (paths.length > 0) {
    await serviceSb.storage.from('build-artifacts').remove(paths).catch(() => {})
  }

  const { error } = await serviceSb.from('builds').delete().eq('id', buildId)
  if (error) return apiError('DB_ERROR', error.message, 500)

  await insertChangelog(serviceSb, {
    organizationId: orgId,
    buildId,
    userId: user.id,
    entityType: 'build',
    entityId: buildId,
    action: 'delete',
  })

  return Response.json({ data: { deleted: buildId } })
}
