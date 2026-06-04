import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { PhasesBar } from '@/components/dashboard/PhasesBar'
import { RecentArtifacts } from '@/components/dashboard/RecentArtifacts'
import { Button } from '@/components/ui/button'
import { Building2, Plus } from 'lucide-react'
import type { OrgWithRole, DashboardStats } from '@/types/api'

async function getOrgs(): Promise<OrgWithRole[]> {
  try {
    const supabase = await createClient()
    const { data: memberships } = await supabase
      .from('organization_members')
      .select('organization_id, role')

    if (!memberships?.length) return []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mems = memberships as any[]
    const orgIds = mems.map((m) => m.organization_id as string)
    const { data: orgs } = await supabase
      .from('organizations')
      .select('*')
      .in('id', orgIds)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((orgs ?? []) as any[]).map((org) => ({
      ...org,
      role: mems.find((m) => m.organization_id === org.id)?.role ?? 'viewer',
    })) as OrgWithRole[]
  } catch {
    return []
  }
}

async function getDashboard(orgId: string): Promise<DashboardStats | null> {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const res = await fetch(`${base}/api/organizations/${orgId}/dashboard`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    const json = await res.json()
    return json.data ?? null
  } catch {
    return null
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { org?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const orgs = await getOrgs()

  if (orgs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-8 text-center">
        <div className="p-4 bg-primary/10 rounded-full">
          <Building2 className="h-10 w-10 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">Welcome to MEEN Data Viz</h2>
          <p className="text-muted-foreground max-w-md">
            Create your first organization to start managing materials science experiment builds.
          </p>
        </div>
        <div className="flex gap-3">
          <Button render={<a href="/dashboard?create=org" />}>
              <Plus className="mr-2 h-4 w-4" />
              Create Organization
            </Button>
        </div>
      </div>
    )
  }

  const activeOrgId = searchParams.org ?? orgs[0]?.id
  const stats = await getDashboard(activeOrgId)

  const emptyStats: DashboardStats = {
    totalBuilds: 0,
    completeBuilds: 0,
    inProgressBuilds: 0,
    phasesCompleted: new Array(9).fill(0),
    recentArtifacts: [],
  }

  const data = stats ?? emptyStats

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {orgs.find(o => o.id === activeOrgId)?.name ?? 'Overview'}
          </p>
        </div>
        <Button render={<Link href="/builds" />}>
            View Builds
          </Button>
      </div>

      {/* Org selector if multiple */}
      {orgs.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {orgs.map(org => (
            <a
              key={org.id}
              href={`/dashboard?org=${org.id}`}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                org.id === activeOrgId
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {org.name}
            </a>
          ))}
        </div>
      )}

      {/* Stats */}
      <StatsCards
        totalBuilds={data.totalBuilds}
        completeBuilds={data.completeBuilds}
        inProgressBuilds={data.inProgressBuilds}
      />

      {/* Chart */}
      <PhasesBar phasesCompleted={data.phasesCompleted} />

      {/* Recent artifacts */}
      <RecentArtifacts artifacts={data.recentArtifacts} />
    </div>
  )
}
