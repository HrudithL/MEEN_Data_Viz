import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { apiError } from '@/lib/utils'

async function getOrgForArtifact(supabase: Awaited<ReturnType<typeof createClient>>, artifactId: string) {
  const { data } = await supabase
    .from('artifacts')
    .select('phases!inner(builds!inner(organization_id))')
    .eq('id', artifactId)
    .single()
  if (!data) return null
  return (data.phases as any)?.builds?.organization_id as string | null
}

// GET /api/artifacts/[artifactId]/versions/[n]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ artifactId: string; n: string }> }
) {
  const { artifactId, n } = await params
  const versionNumber = parseInt(n)
  if (isNaN(versionNumber) || versionNumber < 1) {
    return apiError('INVALID_VERSION', 'Version number must be a positive integer')
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return apiError('UNAUTHORIZED', 'Not authenticated', 401)

  const orgId = await getOrgForArtifact(supabase, artifactId)
  if (!orgId) return apiError('NOT_FOUND', 'Artifact not found', 404)

  const { data: canView } = await supabase.rpc('can_view_org', { p_org_id: orgId })
  if (!canView) return apiError('FORBIDDEN', 'Access denied', 403)

  const { data: version, error } = await supabase
    .from('artifact_versions')
    .select('*')
    .eq('artifact_id', artifactId)
    .eq('version_number', versionNumber)
    .single()

  if (error || !version) return apiError('NOT_FOUND', 'Version not found', 404)

  // Generate signed download URL
  const serviceSb = createServiceClient()
  const { data: signed } = await serviceSb.storage
    .from('build-artifacts')
    .createSignedUrl(version.storage_path, 3600)

  return Response.json({
    data: {
      ...version,
      signedDownloadUrl: signed?.signedUrl ?? null,
    },
  })
}
