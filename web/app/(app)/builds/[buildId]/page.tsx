import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PHASE_IDS } from '@/lib/constants'
import { getBuildWithPhases } from '@/lib/queries/builds'
import { BuildOverviewVisuals, type PhaseArtifactBreakdown } from '@/components/builds/BuildOverviewVisuals'
import { BuildPhaseChecklist } from '@/components/builds/BuildPhaseChecklist'

export const dynamic = 'force-dynamic'

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

  const build = await getBuildWithPhases(params.buildId)
  if (!build) notFound()

  const role = await getOrgRole(build.organization_id, user.id)
  const canEdit = role === 'admin' || role === 'editor'

  const phaseIds = (build.phases ?? []).map(p => p.id)
  const artifactBreakdown: PhaseArtifactBreakdown[] = PHASE_IDS.map(id => ({
    phaseId: id,
    total: 0,
    byType: {},
  }))

  if (phaseIds.length > 0) {
    const { data: artifacts } = await supabase
      .from('artifacts')
      .select('file_type, phases!inner(phase)')
      .in('phase_id', phaseIds)

    for (const art of artifacts ?? []) {
      const phaseKey = (art.phases as { phase?: string })?.phase
      if (!phaseKey) continue
      const row = artifactBreakdown.find(p => p.phaseId === phaseKey)
      if (!row) continue
      const fileType = art.file_type as string
      row.byType[fileType] = (row.byType[fileType] ?? 0) + 1
      row.total++
    }
  }

  const phaseCompletionMap: Record<string, boolean> = {}
  if (build.phases) {
    for (const phase of build.phases) {
      phaseCompletionMap[phase.phase] = phase.is_complete
    }
  }

  const completedCount = build.completedPhases ?? 0

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                Build Details
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    render={<Link href={`/builds/${params.buildId}/settings`} />}
                  >
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

          <BuildPhaseChecklist
            buildId={params.buildId}
            initialCompletion={phaseCompletionMap}
            initialCompletedCount={completedCount}
          />
        </div>

        <BuildOverviewVisuals buildId={params.buildId} artifactBreakdown={artifactBreakdown} />
      </div>
    </div>
  )
}
