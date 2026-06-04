import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { apiError } from '@/lib/utils'
import { insertChangelog } from '@/lib/changelog'
import { recomputeBuildStatus } from '@/lib/build-status'

async function getArtifactContext(supabase: Awaited<ReturnType<typeof createClient>>, artifactId: string) {
  const { data } = await supabase
    .from('artifacts')
    .select('*, phases!inner(id, phase, build_id, builds!inner(organization_id, id))')
    .eq('id', artifactId)
    .single()
  if (!data) return null
  const phase = data.phases as any
  return {
    artifact: data,
    phaseId: phase?.id as string,
    phaseType: phase?.phase as string,
    buildId: phase?.build_id as string,
    orgId: phase?.builds?.organization_id as string,
  }
}

// GET /api/artifacts/[artifactId]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ artifactId: string }> }
) {
  const { artifactId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return apiError('UNAUTHORIZED', 'Not authenticated', 401)

  const ctx = await getArtifactContext(supabase, artifactId)
  if (!ctx) return apiError('NOT_FOUND', 'Artifact not found', 404)

  const { data: canView } = await supabase.rpc('can_view_org', { p_org_id: ctx.orgId })
  if (!canView) return apiError('FORBIDDEN', 'Access denied', 403)

  return Response.json({ data: ctx.artifact })
}

// PATCH /api/artifacts/[artifactId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ artifactId: string }> }
) {
  const { artifactId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return apiError('UNAUTHORIZED', 'Not authenticated', 401)

  const ctx = await getArtifactContext(supabase, artifactId)
  if (!ctx) return apiError('NOT_FOUND', 'Artifact not found', 404)

  const { data: canEdit } = await supabase.rpc('can_edit_org', { p_org_id: ctx.orgId })
  if (!canEdit) return apiError('FORBIDDEN', 'Editor or admin required', 403)

  const body = await req.json().catch(() => null)
  const updates: Record<string, unknown> = {}
  let jsonDiff: unknown = undefined

  if (body?.label !== undefined) updates.label = body.label
  if (body?.metadata !== undefined) updates.metadata = body.metadata
  if (body?.column_dictionary !== undefined) updates.column_dictionary = body.column_dictionary

  // Handle cell-level parsed_json edits
  if (body?.cell_edit) {
    const { tableIndex, rowIndex, column, value } = body.cell_edit
    const currentParsed = ctx.artifact.parsed_json as any
    if (currentParsed?.kind === 'table' && Array.isArray(currentParsed.tables)) {
      const before = currentParsed.tables[tableIndex]?.rows[rowIndex]?.[column]
      currentParsed.tables[tableIndex].rows[rowIndex][column] = value
      updates.parsed_json = currentParsed
      jsonDiff = { tableIndex, rowIndex, column, before, after: value }
    } else {
      return apiError('INVALID_EDIT', 'Cell edits only supported on table-kind parsed_json')
    }
  }

  if (Object.keys(updates).length === 0) return apiError('NO_CHANGES', 'No fields to update')

  const serviceSb = createServiceClient()
  const { data: updated, error } = await serviceSb
    .from('artifacts')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(updates as any)
    .eq('id', artifactId)
    .select()
    .single()

  if (error) return apiError('DB_ERROR', error.message, 500)

  await insertChangelog(serviceSb, {
    organizationId: ctx.orgId,
    buildId: ctx.buildId,
    userId: user.id,
    entityType: jsonDiff ? 'column_dictionary' : 'artifact',
    entityId: artifactId,
    action: 'update',
    diff: jsonDiff ?? updates,
  })

  return Response.json({ data: updated })
}

// DELETE /api/artifacts/[artifactId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ artifactId: string }> }
) {
  const { artifactId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return apiError('UNAUTHORIZED', 'Not authenticated', 401)

  const ctx = await getArtifactContext(supabase, artifactId)
  if (!ctx) return apiError('NOT_FOUND', 'Artifact not found', 404)

  const { data: canEdit } = await supabase.rpc('can_edit_org', { p_org_id: ctx.orgId })
  if (!canEdit) return apiError('FORBIDDEN', 'Editor or admin required', 403)

  const serviceSb = createServiceClient()

  // Collect version storage paths for cleanup
  const { data: versions } = await serviceSb
    .from('artifact_versions')
    .select('storage_path')
    .eq('artifact_id', artifactId)

  const paths = (versions ?? []).map((v) => v.storage_path).filter(Boolean)
  if (paths.length > 0) {
    await serviceSb.storage.from('build-artifacts').remove(paths).catch(() => {})
  }

  const { error } = await serviceSb.from('artifacts').delete().eq('id', artifactId)
  if (error) return apiError('DB_ERROR', error.message, 500)

  await recomputeBuildStatus(serviceSb, ctx.buildId)

  await insertChangelog(serviceSb, {
    organizationId: ctx.orgId,
    buildId: ctx.buildId,
    userId: user.id,
    entityType: 'artifact',
    entityId: artifactId,
    action: 'delete',
    metadata: { label: ctx.artifact.label, fileType: ctx.artifact.file_type },
  })

  return Response.json({ data: { deleted: artifactId } })
}
