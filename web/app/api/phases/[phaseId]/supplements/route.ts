import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { apiError } from '@/lib/utils'

async function getPhaseContext(supabase: Awaited<ReturnType<typeof createClient>>, phaseId: string) {
  const { data } = await supabase
    .from('phases')
    .select('id, build_id, builds!inner(organization_id)')
    .eq('id', phaseId)
    .single()
  if (!data) return null
  const orgId = (data.builds as any)?.organization_id as string | undefined
  return { buildId: data.build_id, orgId: orgId ?? null }
}

// POST /api/phases/[phaseId]/supplements
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ phaseId: string }> }
) {
  const { phaseId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return apiError('UNAUTHORIZED', 'Not authenticated', 401)

  const ctx = await getPhaseContext(supabase, phaseId)
  if (!ctx?.orgId) return apiError('NOT_FOUND', 'Phase not found', 404)

  const { data: canEdit } = await supabase.rpc('can_edit_org', { p_org_id: ctx.orgId })
  if (!canEdit) return apiError('FORBIDDEN', 'Editor or admin required', 403)

  const body = await req.json().catch(() => null)
  const { storagePath, fileName, caption } = body ?? {}

  if (!storagePath) return apiError('STORAGE_PATH_REQUIRED', 'storagePath is required')
  if (!fileName) return apiError('FILE_NAME_REQUIRED', 'fileName is required')

  const serviceSb = createServiceClient()
  const { data: supplement, error } = await serviceSb
    .from('phase_supplements')
    .insert({
      phase_id: phaseId,
      storage_path: storagePath,
      file_name: fileName,
      caption: caption ?? null,
      uploaded_by: user.id,
    })
    .select()
    .single()

  if (error || !supplement) return apiError('DB_ERROR', error?.message ?? 'Failed to insert supplement', 500)

  return Response.json({ data: supplement }, { status: 201 })
}
