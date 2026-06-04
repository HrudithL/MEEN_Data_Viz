import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { apiError } from '@/lib/utils'
import { insertChangelog } from '@/lib/changelog'

// POST /api/invitations/accept
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return apiError('UNAUTHORIZED', 'Not authenticated', 401)

  const body = await req.json().catch(() => null)
  const { token } = body ?? {}
  if (!token) return apiError('TOKEN_REQUIRED', 'Invitation token is required')

  const serviceSb = createServiceClient()

  const { data: invitation, error: inviteError } = await serviceSb
    .from('organization_invitations')
    .select('*')
    .eq('token', token)
    .single()

  if (inviteError || !invitation) return apiError('NOT_FOUND', 'Invitation not found', 404)
  if (invitation.accepted_at) return apiError('ALREADY_ACCEPTED', 'Invitation has already been accepted', 400)
  if (new Date(invitation.expires_at) < new Date()) {
    return apiError('EXPIRED', 'Invitation has expired', 400)
  }

  // Check if user is already a member
  const { data: existingMember } = await serviceSb
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', invitation.organization_id)
    .eq('user_id', user.id)
    .single()

  if (existingMember) {
    // Mark accepted and return success (idempotent)
    await serviceSb
      .from('organization_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id)

    return Response.json({ data: { organizationId: invitation.organization_id, role: invitation.role } })
  }

  // Insert member row
  const { error: memberError } = await serviceSb
    .from('organization_members')
    .insert({
      organization_id: invitation.organization_id,
      user_id: user.id,
      role: invitation.role,
      joined_at: new Date().toISOString(),
    })

  if (memberError) return apiError('DB_ERROR', memberError.message, 500)

  // Mark invitation accepted
  await serviceSb
    .from('organization_invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)

  await insertChangelog(serviceSb, {
    organizationId: invitation.organization_id,
    userId: user.id,
    entityType: 'invitation',
    entityId: invitation.id,
    action: 'invite_accept',
    metadata: { role: invitation.role },
  })

  return Response.json({ data: { organizationId: invitation.organization_id, role: invitation.role } })
}
