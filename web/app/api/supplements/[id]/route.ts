import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { apiError } from '@/lib/utils'

// DELETE /api/supplements/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return apiError('UNAUTHORIZED', 'Not authenticated', 401)

  // Fetch supplement to get org context
  const { data: supplement } = await supabase
    .from('phase_supplements')
    .select('id, storage_path, phases!inner(build_id, builds!inner(organization_id))')
    .eq('id', id)
    .single()

  if (!supplement) return apiError('NOT_FOUND', 'Supplement not found', 404)

  const orgId = (supplement.phases as any)?.builds?.organization_id as string | undefined
  if (!orgId) return apiError('NOT_FOUND', 'Cannot determine organization', 404)

  const { data: canEdit } = await supabase.rpc('can_edit_org', { p_org_id: orgId })
  if (!canEdit) return apiError('FORBIDDEN', 'Editor or admin required', 403)

  const serviceSb = createServiceClient()

  // Best-effort storage cleanup
  if (supplement.storage_path) {
    await serviceSb.storage
      .from('build-artifacts')
      .remove([supplement.storage_path])
      .catch(() => {})
  }

  const { error } = await serviceSb
    .from('phase_supplements')
    .delete()
    .eq('id', id)

  if (error) return apiError('DB_ERROR', error.message, 500)

  return Response.json({ data: { deleted: id } })
}
