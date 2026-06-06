import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { apiError, fileExtension, isReferenceExtensionAllowed } from '@/lib/utils'
import { insertChangelog } from '@/lib/changelog'

async function getBuildOrgId(supabase: Awaited<ReturnType<typeof createClient>>, buildId: string) {
  const { data } = await supabase
    .from('builds')
    .select('organization_id')
    .eq('id', buildId)
    .single()
  return data?.organization_id ?? null
}

// GET /api/builds/[buildId]/references
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ buildId: string }> }
) {
  const { buildId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return apiError('UNAUTHORIZED', 'Not authenticated', 401)

  const orgId = await getBuildOrgId(supabase, buildId)
  if (!orgId) return apiError('NOT_FOUND', 'Build not found', 404)

  const { data: canView } = await supabase.rpc('can_view_org', { p_org_id: orgId })
  if (!canView) return apiError('FORBIDDEN', 'Access denied', 403)

  const { data, error } = await supabase
    .from('build_references')
    .select('*')
    .eq('build_id', buildId)
    .order('uploaded_at', { ascending: false })

  if (error) return apiError('DB_ERROR', error.message, 500)

  return Response.json({ data: data ?? [] })
}

// POST /api/builds/[buildId]/references — register after client PUT to storage
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ buildId: string }> }
) {
  const { buildId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return apiError('UNAUTHORIZED', 'Not authenticated', 401)

  const orgId = await getBuildOrgId(supabase, buildId)
  if (!orgId) return apiError('NOT_FOUND', 'Build not found', 404)

  const { data: canEdit } = await supabase.rpc('can_edit_org', { p_org_id: orgId })
  if (!canEdit) return apiError('FORBIDDEN', 'Editor or admin required', 403)

  const body = await req.json().catch(() => null)
  const { label, description, storagePath, fileName, fileSize, mimeType } = body ?? {}

  if (!storagePath || !fileName) {
    return apiError('MISSING_FIELDS', 'storagePath and fileName are required')
  }
  if (!isReferenceExtensionAllowed(fileName)) {
    return apiError('UNSUPPORTED_FORMAT', 'File type not allowed for project reference uploads', 400)
  }

  const ext = fileExtension(fileName)
  const serviceSb = createServiceClient()

  const { data: row, error: insertError } = await serviceSb
    .from('build_references')
    .insert({
      build_id: buildId,
      label: (label?.trim() || fileName.replace(/\.[^.]+$/, '') || 'reference'),
      description: description?.trim() || null,
      file_name: fileName,
      file_extension: ext,
      storage_path: storagePath,
      file_size: fileSize ?? 0,
      mime_type: mimeType ?? null,
      uploaded_by: user.id,
    })
    .select()
    .single()

  if (insertError || !row) {
    return apiError('DB_ERROR', insertError?.message ?? 'Failed to save reference', 500)
  }

  await insertChangelog(serviceSb, {
    organizationId: orgId,
    buildId,
    userId: user.id,
    entityType: 'reference',
    entityId: row.id,
    action: 'create',
    metadata: { fileName, label: row.label },
  })

  return Response.json({ data: row }, { status: 201 })
}
