import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/utils'

// GET /api/builds/[buildId]/changelog
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
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50')))
  const offset = (page - 1) * limit

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const serviceSb = (await import('@/lib/supabase/service')).createServiceClient()
  await serviceSb.from('changelog').delete().lt('created_at', thirtyDaysAgo)

  const { data, error, count } = await supabase
    .from('changelog')
    .select('*, profiles(id, email, display_name)', { count: 'exact' })
    .eq('build_id', buildId)
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return apiError('DB_ERROR', error.message, 500)

  return Response.json({
    data: data ?? [],
    meta: { page, limit, total: count ?? 0 },
  })
}
