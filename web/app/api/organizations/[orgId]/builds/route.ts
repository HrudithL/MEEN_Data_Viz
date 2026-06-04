import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { apiError } from '@/lib/utils'
import { insertChangelog } from '@/lib/changelog'

// GET /api/organizations/[orgId]/builds
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return apiError('UNAUTHORIZED', 'Not authenticated', 401)

  const { data: canView } = await supabase.rpc('can_view_org', { p_org_id: orgId })
  if (!canView) return apiError('FORBIDDEN', 'Access denied', 403)

  const { data, error } = await supabase
    .from('builds')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  if (error) return apiError('DB_ERROR', error.message, 500)

  return Response.json({ data: data ?? [] })
}

// POST /api/organizations/[orgId]/builds
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return apiError('UNAUTHORIZED', 'Not authenticated', 401)

  const { data: canEdit } = await supabase.rpc('can_edit_org', { p_org_id: orgId })
  if (!canEdit) return apiError('FORBIDDEN', 'Editor or admin required', 403)

  const body = await req.json().catch(() => null)
  if (!body?.name?.trim()) return apiError('NAME_REQUIRED', 'Build name is required')

  const serviceSb = createServiceClient()

  const { data: build, error: buildError } = await serviceSb
    .from('builds')
    .insert({
      organization_id: orgId,
      name: body.name.trim(),
      description: body.description ?? null,
      material: body.material ?? null,
      process: body.process ?? null,
      created_by: user.id,
    })
    .select()
    .single()

  if (buildError || !build) return apiError('DB_ERROR', buildError?.message ?? 'Failed to create build', 500)

  await insertChangelog(serviceSb, {
    organizationId: orgId,
    buildId: build.id,
    userId: user.id,
    entityType: 'build',
    entityId: build.id,
    action: 'create',
    metadata: { name: build.name },
  })

  return Response.json({ data: build }, { status: 201 })
}
