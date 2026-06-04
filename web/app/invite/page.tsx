import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import InviteClientPage from './InviteClientPage'

interface InvitePageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function InvitePage({ searchParams }: InvitePageProps) {
  const { token } = await searchParams

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Invalid invitation</h1>
          <p className="text-gray-500 text-sm">No invitation token provided.</p>
        </div>
      </div>
    )
  }

  // Use service client to look up invitation (bypasses RLS)
  const serviceSb = createServiceClient()
  const { data: invitation } = await serviceSb
    .from('organization_invitations')
    .select('id, organization_id, email, role, expires_at, accepted_at, organizations(name)')
    .eq('token', token)
    .single()

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Invitation not found</h1>
          <p className="text-gray-500 text-sm">This invitation link is invalid or has been removed.</p>
        </div>
      </div>
    )
  }

  if (invitation.accepted_at) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Already accepted</h1>
          <p className="text-gray-500 text-sm">This invitation has already been accepted.</p>
        </div>
      </div>
    )
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Invitation expired</h1>
          <p className="text-gray-500 text-sm">This invitation has expired. Please request a new one.</p>
        </div>
      </div>
    )
  }

  // Check if user is authenticated
  const serverSb = await createClient()
  const { data: { user } } = await serverSb.auth.getUser()

  const orgName = (invitation.organizations as { name: string } | null)?.name ?? 'an organization'

  return (
    <InviteClientPage
      token={token}
      orgName={orgName}
      role={invitation.role}
      invitedEmail={invitation.email}
      isAuthenticated={!!user}
      currentUserEmail={user?.email ?? null}
    />
  )
}
