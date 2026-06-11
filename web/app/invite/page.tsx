import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import InviteClientPage from './InviteClientPage'

interface InvitePageProps {
    searchParams: Promise<{ token?: string }>
}

function InviteError({ title, message }: { title: string; message: string }) {
    return (
        <div className="min-h-screen flex items-center justify-center auth-bg px-4">
            <div className="glass rounded-2xl p-8 max-w-md w-full text-center">
                <h1 className="text-xl font-semibold text-foreground mb-2">{title}</h1>
                <p className="text-muted-foreground text-sm">{message}</p>
            </div>
        </div>
    )
}

export default async function InvitePage({ searchParams }: InvitePageProps) {
    const { token } = await searchParams

    if (!token) {
        return <InviteError title="Invalid invitation" message="No invitation token provided." />
    }

    const serviceSb = createServiceClient()
    const { data: invitation } = await serviceSb
        .from('organization_invitations')
        .select('id, organization_id, email, role, expires_at, accepted_at, organizations(name)')
        .eq('token', token)
        .single()

    if (!invitation) {
        return <InviteError title="Invitation not found" message="This invitation link is invalid or has been removed." />
    }

    if (invitation.accepted_at) {
        return <InviteError title="Already accepted" message="This invitation has already been accepted." />
    }

    if (new Date(invitation.expires_at) < new Date()) {
        return <InviteError title="Invitation expired" message="This invitation has expired. Please request a new one." />
    }

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
