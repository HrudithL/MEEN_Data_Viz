import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { PhasesBar } from '@/components/dashboard/PhasesBar'
import { RecentArtifacts } from '@/components/dashboard/RecentArtifacts'
import { BuildStatusChart } from '@/components/dashboard/BuildStatusChart'
import { UploadActivityChart } from '@/components/dashboard/UploadActivityChart'
import { RecentBuildsList } from '@/components/dashboard/RecentBuildsList'
import { Button } from '@/components/ui/button'
import { EmptyOrgState } from '@/components/dashboard/EmptyOrgState'
import { getDashboardStats } from '@/lib/queries/dashboard'
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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { org?: string; create?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const orgs = await getOrgs()

  if (orgs.length === 0) {
    return <EmptyOrgState defaultOpen={searchParams.create === 'org'} />
  }

  const activeOrgId = searchParams.org ?? orgs[0]?.id
  const stats = await getDashboardStats(activeOrgId)

  const emptyStats: DashboardStats = {
    totalBuilds: 0,
    completeBuilds: 0,
    inProgressBuilds: 0,
    phasesCompleted: new Array(9).fill(0),
    recentArtifacts: [],
    uploadsByDay: [],
    recentBuilds: [],
    totalArtifacts: 0,
    artifactsThisWeek: 0,
  }

  const data = stats ?? emptyStats

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {orgs.find(o => o.id === activeOrgId)?.name ?? 'Overview'}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <Button className="btn-coral" render={<Link href="/builds" />}>
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
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ease-snappy interactive active:scale-[0.97] ${
                org.id === activeOrgId
                  ? 'btn-coral'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:scale-[1.02]'
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

      <div className="relative rounded-xl bg-card card-pattern p-6 ring-1 ring-foreground/10">
        <p className="text-sm text-muted-foreground">Total Artifacts</p>
        <p className="text-3xl font-bold mt-1 tabular-nums">{data.totalArtifacts}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PhasesBar phasesCompleted={data.phasesCompleted} />
        <BuildStatusChart
          completeBuilds={data.completeBuilds}
          inProgressBuilds={data.inProgressBuilds}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <UploadActivityChart uploadsByDay={data.uploadsByDay} />
        <RecentBuildsList builds={data.recentBuilds} />
      </div>

      <RecentArtifacts artifacts={data.recentArtifacts} />
    </div>
  )
}
