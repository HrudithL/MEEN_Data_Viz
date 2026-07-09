import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { apiError } from '@/lib/utils'
import { insertChangelog } from '@/lib/changelog'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'noreply@meendataviz.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// POST /api/organizations/[orgId]/invitations — create & send invitation
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
  const { email, role } = body ?? {}

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return apiError('INVALID_EMAIL', 'Valid email is required')
  }
  if (!role || !['admin', 'editor', 'viewer'].includes(role)) {
    return apiError('INVALID_ROLE', 'Role must be admin, editor, or viewer')
  }

  const serviceSb = createServiceClient()

  // Get org name for email
  const { data: org } = await serviceSb
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single()

  // Create invitation with 7-day expiry
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: invitation, error: inviteError } = await serviceSb
    .from('organization_invitations')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({
      organization_id: orgId,
      email: email.toLowerCase().trim(),
      role,
      invited_by: user.id,
      expires_at: expiresAt,
    } as any)
    .select()
    .single()

  if (inviteError || !invitation) {
    return apiError('DB_ERROR', inviteError?.message ?? 'Failed to create invitation', 500)
  }

  const inviteUrl = `${APP_URL}/invite?token=${invitation.token}`

  // Send email via Resend
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `You've been invited to join ${org?.name ?? 'an organization'} on M4 Data Viz`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
          <h2 style="color: #1d4ed8;">M4 Data Viz Invitation</h2>
          <p>You've been invited to join <strong>${org?.name ?? 'an organization'}</strong> as a <strong>${role}</strong>.</p>
          <p>This invitation expires in 7 days.</p>
          <a href="${inviteUrl}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0;">
            Accept Invitation
          </a>
          <p style="color:#6b7280;font-size:12px;">Or copy this link: ${inviteUrl}</p>
        </div>
      `,
    })
  } catch (emailErr) {
    // Log but don't fail — invitation already created
    console.error('Failed to send invitation email:', emailErr)
  }

  await insertChangelog(serviceSb, {
    organizationId: orgId,
    userId: user.id,
    entityType: 'invitation',
    entityId: invitation.id,
    action: 'invite',
    metadata: { email, role },
  })

  return Response.json({ data: { id: invitation.id, email, role, expiresAt } }, { status: 201 })
}
