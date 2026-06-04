import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { apiError } from '@/lib/utils'
import { insertChangelog } from '@/lib/changelog'

// POST /api/organizations/[orgId]/transfer-admin — transfer admin role
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return apiError('UNAUTHORIZED', 'Not authenticated', 401)

  const { data: isAdmin } = await supabase.rpc('is_org_admin', { p_org_id: orgId })
  if (!isAdmin) return apiError('FORBIDDEN', 'Admin required', 403)

  const body = await req.json().catch(() => null)
  const { targetUserId } = body ?? {}
  if (!targetUserId) return apiError('TARGET_REQUIRED', 'targetUserId is required')
  if (targetUserId === user.id) return apiError('INVALID_TARGET', 'Cannot transfer admin to yourself')

  // Verify target is an editor in this org
  const { data: targetMember } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', orgId)
    .eq('user_id', targetUserId)
    .single()

  if (!targetMember) return apiError('NOT_FOUND', 'Target user is not a member of this org', 404)
  if (targetMember.role !== 'editor') {
    return apiError('INVALID_TARGET', 'Target must be an editor to receive admin role')
  }

  const serviceSb = createServiceClient()

  // Promote target to admin
  await serviceSb
    .from('organization_members')
    .update({ role: 'admin' })
    .eq('organization_id', orgId)
    .eq('user_id', targetUserId)

  // Demote caller to editor
  await serviceSb
    .from('organization_members')
    .update({ role: 'editor' })
    .eq('organization_id', orgId)
    .eq('user_id', user.id)

  await insertChangelog(serviceSb, {
    organizationId: orgId,
    userId: user.id,
    entityType: 'membership',
    entityId: targetUserId,
    action: 'admin_transfer',
    diff: { from: user.id, to: targetUserId },
  })

  return Response.json({ data: { transferred: true, newAdmin: targetUserId } })
}
