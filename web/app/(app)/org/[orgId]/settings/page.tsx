import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OrgSettingsClient } from './OrgSettingsClient'

async function getOrgData(orgId: string, userId: string) {
  const supabase = await createClient()

  // Get user role
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .single()

  if (!membership) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mem = membership as any

  // Get org
  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single()

  if (!org) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgData = org as any

  return { org: orgData, role: mem.role }
}

export default async function OrgSettingsPage({
  params,
}: {
  params: { orgId: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const orgData = await getOrgData(params.orgId, user.id)
  if (!orgData) notFound()

  return (
    <OrgSettingsClient
      orgId={params.orgId}
      orgName={orgData.org.name}
      currentUserId={user.id}
      userRole={orgData.role}
    />
  )
}
