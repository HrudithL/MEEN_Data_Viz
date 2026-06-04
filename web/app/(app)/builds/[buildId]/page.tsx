import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CheckCircle2, Circle, Database, BarChart3, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { PHASE_IDS, PHASE_DISPLAY } from '@/lib/constants'
import type { BuildWithPhases } from '@/types/api'

async function getBuild(buildId: string): Promise<BuildWithPhases | null> {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const res = await fetch(`${base}/api/builds/${buildId}`, { cache: 'no-store' })
    if (!res.ok) return null
    const json = await res.json()
    return json.data ?? null
  } catch {
    return null
  }
}

async function getOrgRole(orgId: string, userId: string): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .single()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as any)?.role ?? null
  } catch {
    return null
  }
}

export default async function BuildOverviewPage({
  params,
}: {
  params: { buildId: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const build = await getBuild(params.buildId)
  if (!build) notFound()

  const role = await getOrgRole(build.organization_id, user.id)
  const canEdit = role === 'admin' || role === 'editor'

  // Create a map of phase completion from phases array
  const phaseCompletionMap: Record<string, boolean> = {}
  if (build.phases) {
    for (const phase of build.phases) {
      phaseCompletionMap[phase.phase] = phase.is_complete
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Quick actions */}
      <div className="flex gap-3">
        <Button render={<Link href={`/builds/${params.buildId}/data`} />}>
            <Database className="mr-2 h-4 w-4" />
            Manage Data
          </Button>
        <Button variant="outline" render={<Link href={`/builds/${params.buildId}/visualizations`} />}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Visualizations
          </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Build info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              Build Details
              {canEdit && (
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                  <Edit className="h-3 w-3" />
                  Edit
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Name', value: build.name },
              { label: 'Material', value: build.material },
              { label: 'Process', value: build.process },
              { label: 'Description', value: build.description },
              {
                label: 'Status',
                value: build.status === 'complete' ? 'Complete' : 'In Progress',
              },
              {
                label: 'Created',
                value: new Date(build.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                }),
              },
            ]
              .filter(item => item.value)
              .map(item => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium text-right max-w-[60%]">{item.value}</span>
                </div>
              ))}
          </CardContent>
        </Card>

        {/* Phase checklist */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Phase Checklist
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {build.completedPhases}/{PHASE_IDS.length} complete
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {PHASE_IDS.map((phaseId, index) => {
                const isComplete = phaseCompletionMap[phaseId] ?? false
                return (
                  <li
                    key={phaseId}
                    className="flex items-center gap-3 px-5 py-2.5 hover:bg-muted/30 transition-colors"
                  >
                    <span className="text-xs text-muted-foreground w-4 shrink-0">
                      {index + 1}
                    </span>
                    {isComplete ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <Link
                      href={`/builds/${params.buildId}/data`}
                      className={cn(
                        'text-sm flex-1 hover:underline',
                        isComplete ? 'text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {PHASE_DISPLAY[phaseId]}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
