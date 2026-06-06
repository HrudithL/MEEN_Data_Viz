import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BuildSettingsForm } from '@/components/builds/BuildSettingsForm'
import { getBuildWithPhases } from '@/lib/queries/builds'

async function getOrgRole(orgId: string, userId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .single()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any)?.role ?? null
}

export default async function BuildSettingsPage({
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

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Project settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Update build name, material, process, and description.
        </p>
      </div>
      <BuildSettingsForm build={build} canEdit={canEdit} />
    </div>
  )
}
