import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { apiError } from '@/lib/utils'
import { insertChangelog } from '@/lib/changelog'

// PATCH /api/organizations/[orgId]/members/[userId] — change role
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; userId: string }> }
) {
  const { orgId, userId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return apiError('UNAUTHORIZED', 'Not authenticated', 401)

  const { data: isAdmin } = await supabase.rpc('is_org_admin', { p_org_id: orgId })
  if (!isAdmin) return apiError('FORBIDDEN', 'Admin required', 403)

  const body = await req.json().catch(() => null)
  const { role } = body ?? {}
  if (!role || !['admin', 'editor', 'viewer'].includes(role)) {
    return apiError('INVALID_ROLE', 'Role must be admin, editor, or viewer')
  }

  // Cannot change own role away from admin if last admin
  if (userId === user.id && role !== 'admin') {
    const { count } = await supabase
      .from('organization_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('role', 'admin')
    if ((count ?? 0) <= 1) {
      return apiError('LAST_ADMIN', 'Cannot demote the last admin', 400)
    }
  }

  const serviceSb = createServiceClient()
  const { error } = await serviceSb
    .from('organization_members')
    .update({ role })
    .eq('organization_id', orgId)
    .eq('user_id', userId)

  if (error) return apiError('DB_ERROR', error.message, 500)

  await insertChangelog(serviceSb, {
    organizationId: orgId,
    userId: user.id,
    entityType: 'membership',
    entityId: userId,
    action: 'role_change',
    diff: { role },
  })

  return Response.json({ data: { userId, role } })
}

// DELETE /api/organizations/[orgId]/members/[userId] — remove member
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string; userId: string }> }
) {
  const { orgId, userId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return apiError('UNAUTHORIZED', 'Not authenticated', 401)

  const { data: isAdmin } = await supabase.rpc('is_org_admin', { p_org_id: orgId })
  if (!isAdmin) return apiError('FORBIDDEN', 'Admin required', 403)

  if (userId === user.id) {
    return apiError('CANNOT_REMOVE_SELF', 'Admins cannot remove themselves', 400)
  }

  const serviceSb = createServiceClient()
  const { error } = await serviceSb
    .from('organization_members')
    .delete()
    .eq('organization_id', orgId)
    .eq('user_id', userId)

  if (error) return apiError('DB_ERROR', error.message, 500)

  await insertChangelog(serviceSb, {
    organizationId: orgId,
    userId: user.id,
    entityType: 'membership',
    entityId: userId,
    action: 'delete',
  })

  return Response.json({ data: { removed: userId } })
}
