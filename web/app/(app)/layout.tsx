import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import type { OrgWithRole } from '@/types/api'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  // Fetch orgs user belongs to + their role
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawMemberships } = await supabase
    .from('organization_members')
    .select('role, organizations(id, name, created_at, created_by)')
    .eq('user_id', user.id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memberships = (rawMemberships ?? []) as any[]

  const orgs: OrgWithRole[] = memberships.map((m) => {
    const org = m.organizations
    return {
      id: org?.id ?? '',
      name: org?.name ?? '',
      created_at: org?.created_at ?? '',
      created_by: org?.created_by ?? '',
      role: (m.role ?? 'viewer') as OrgWithRole['role'],
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawProfile } = await supabase
    .from('profiles')
    .select('display_name, email')
    .eq('id', user.id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = rawProfile as any

  const email: string = profile?.email ?? user.email ?? ''
  const displayName: string | null = profile?.display_name ?? null

  return (
    <AppShell orgs={orgs} userEmail={email} userDisplayName={displayName}>
      {children}
    </AppShell>
  )
}
