import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { apiError } from '@/lib/utils'
import { insertChangelog } from '@/lib/changelog'

// DELETE /api/builds/[buildId]/references/[refId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ buildId: string; refId: string }> }
) {
  const { buildId, refId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return apiError('UNAUTHORIZED', 'Not authenticated', 401)

  const { data: build } = await supabase
    .from('builds')
    .select('organization_id')
    .eq('id', buildId)
    .single()

  if (!build) return apiError('NOT_FOUND', 'Build not found', 404)

  const { data: canEdit } = await supabase.rpc('can_edit_org', {
    p_org_id: build.organization_id,
  })
  if (!canEdit) return apiError('FORBIDDEN', 'Editor or admin required', 403)

  const serviceSb = createServiceClient()

  const { data: ref, error: fetchError } = await serviceSb
    .from('build_references')
    .select('*')
    .eq('id', refId)
    .eq('build_id', buildId)
    .single()

  if (fetchError || !ref) return apiError('NOT_FOUND', 'Reference not found', 404)

  await serviceSb.storage.from('build-artifacts').remove([ref.storage_path]).catch(() => {})

  const { error: deleteError } = await serviceSb
    .from('build_references')
    .delete()
    .eq('id', refId)

  if (deleteError) return apiError('DB_ERROR', deleteError.message, 500)

  await insertChangelog(serviceSb, {
    organizationId: build.organization_id,
    buildId,
    userId: user.id,
    entityType: 'reference',
    entityId: refId,
    action: 'delete',
    metadata: { fileName: ref.file_name },
  })

  return Response.json({ data: { deleted: refId } })
}
