import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/utils'

// GET /api/organizations/[orgId]/changelog
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return apiError('UNAUTHORIZED', 'Not authenticated', 401)

  const { data: canView } = await supabase.rpc('can_view_org', { p_org_id: orgId })
  if (!canView) return apiError('FORBIDDEN', 'Access denied', 403)

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50')))
  const offset = (page - 1) * limit

  const { data, error, count } = await supabase
    .from('changelog')
    .select('*, profiles(id, email, display_name)', { count: 'exact' })
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return apiError('DB_ERROR', error.message, 500)

  return Response.json({
    data: data ?? [],
    meta: { page, limit, total: count ?? 0 },
  })
}
