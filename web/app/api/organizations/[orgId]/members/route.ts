import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/utils'

// GET /api/organizations/[orgId]/members
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
    .from('organization_members')
    .select('user_id, role, joined_at, profiles(id, email, display_name, created_at)')
    .eq('organization_id', orgId)
    .order('joined_at', { ascending: true })

  if (error) return apiError('DB_ERROR', error.message, 500)

  const members = (data ?? []).map((row) => ({
    userId: row.user_id,
    role: row.role,
    joinedAt: row.joined_at,
    profile: row.profiles,
  }))

  return Response.json({ data: members })
}
