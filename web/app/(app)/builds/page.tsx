import { redirect } from 'next/navigation'
import { FlaskConical } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { BuildsList } from '@/components/builds/BuildsList'
import { CreateBuildDialog } from '@/components/builds/CreateBuildDialog'
import { getBuildsForOrg } from '@/lib/queries/builds'
import type { OrgWithRole } from '@/types/api'
import type { BuildWithProgress } from '@/lib/queries/builds'

export const dynamic = 'force-dynamic'

async function getOrgs(userId: string): Promise<OrgWithRole[]> {
  try {
    const supabase = await createClient()
    const { data: memberships } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', userId)

    if (!memberships?.length) return []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mems = memberships as any[]
    const orgIds = mems.map((m) => m.organization_id as string)
    const { data: orgs } = await supabase.from('organizations').select('*').in('id', orgIds)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((orgs ?? []) as any[]).map((org) => ({
      ...org,
      role: mems.find((m) => m.organization_id === org.id)?.role ?? 'viewer',
    })) as OrgWithRole[]
  } catch {
    return []
  }
}

export default async function BuildsPage({
  searchParams,
}: {
  searchParams: { org?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const orgs = await getOrgs(user.id)
  if (orgs.length === 0) {
    redirect('/dashboard')
  }

  const activeOrgId = searchParams.org ?? orgs[0]?.id
  const activeOrg = orgs.find(o => o.id === activeOrgId) ?? orgs[0]
  const canEdit = activeOrg?.role === 'admin' || activeOrg?.role === 'editor'
  const canDelete = activeOrg?.role === 'admin'

  const builds: BuildWithProgress[] = await getBuildsForOrg(activeOrg?.id ?? '')

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Builds</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {activeOrg?.name ?? 'All experiment builds'}
          </p>
        </div>
        {canEdit && (
          <CreateBuildDialog orgId={activeOrg?.id ?? ''} />
        )}
      </div>

      {/* Org filter tabs if multiple orgs */}
      {orgs.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {orgs.map(org => (
            <a
              key={org.id}
              href={`/builds?org=${org.id}`}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                org.id === activeOrg?.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {org.name}
            </a>
          ))}
        </div>
      )}

      {/* Build grid or empty state */}
      {builds.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center gap-4">
          <div className="p-4 bg-muted rounded-full">
            <FlaskConical className="h-10 w-10 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">No builds yet</h2>
            <p className="text-muted-foreground text-sm mt-1">
              {canEdit
                ? 'Create your first experiment build to start collecting data.'
                : 'No builds have been created in this organization yet.'}
            </p>
          </div>
          {canEdit && (
            <CreateBuildDialog
              orgId={activeOrg?.id ?? ''}
              trigger={
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
                  Create first build
                </button>
              }
            />
          )}
        </div>
      ) : (
        <BuildsList orgId={activeOrg?.id ?? ''} initialBuilds={builds} canDelete={canDelete} />
      )}
    </div>
  )
}
