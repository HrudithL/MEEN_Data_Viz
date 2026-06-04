import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { apiError } from '@/lib/utils'

// GET /api/storage/sign-download?storagePath=...
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return apiError('UNAUTHORIZED', 'Not authenticated', 401)

  const { searchParams } = new URL(req.url)
  const storagePath = searchParams.get('storagePath')
  if (!storagePath) return apiError('MISSING_PATH', 'storagePath query param is required')

  // Extract orgId from path: org/{orgId}/build/...
  const match = storagePath.match(/^org\/([^/]+)\//)
  const orgId = match?.[1]
  if (!orgId) return apiError('INVALID_PATH', 'Cannot determine org from storage path')

  const { data: canView } = await supabase.rpc('can_view_org', { p_org_id: orgId })
  if (!canView) return apiError('FORBIDDEN', 'Access denied', 403)

  const serviceSb = createServiceClient()
  const { data: signed, error: signError } = await serviceSb.storage
    .from('build-artifacts')
    .createSignedUrl(storagePath, 3600) // 1 hour

  if (signError || !signed) {
    return apiError('STORAGE_ERROR', signError?.message ?? 'Failed to create signed download URL', 500)
  }

  return Response.json({ data: { signedUrl: signed.signedUrl, expiresIn: 3600 } })
}
