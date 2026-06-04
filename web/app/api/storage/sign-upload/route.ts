import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { apiError, isRejectedExtension } from '@/lib/utils'
import { MAX_UPLOAD_BYTES } from '@/lib/constants'
import { randomUUID } from 'crypto'

// POST /api/storage/sign-upload
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return apiError('UNAUTHORIZED', 'Not authenticated', 401)

  const body = await req.json().catch(() => null)
  const { orgId, buildId, phaseId, fileName, fileSize, mimeType } = body ?? {}

  if (!orgId || !buildId || !phaseId || !fileName) {
    return apiError('MISSING_FIELDS', 'orgId, buildId, phaseId, and fileName are required')
  }

  if (isRejectedExtension(fileName)) {
    return apiError('UNSUPPORTED_FORMAT', 'Excel files (.xlsx, .xls) are not supported', 400)
  }

  if (typeof fileSize === 'number' && fileSize > MAX_UPLOAD_BYTES) {
    return apiError(
      'FILE_TOO_LARGE',
      `File size ${fileSize} exceeds max allowed ${MAX_UPLOAD_BYTES} bytes`,
      400
    )
  }

  const { data: canEdit } = await supabase.rpc('can_edit_org', { p_org_id: orgId })
  if (!canEdit) return apiError('FORBIDDEN', 'Editor or admin required', 403)

  const artifactId = randomUUID()
  const storagePath = `org/${orgId}/build/${buildId}/phase/${phaseId}/artifact/${artifactId}/v1/${fileName}`

  const serviceSb = createServiceClient()
  const { data: signed, error: signError } = await serviceSb.storage
    .from('build-artifacts')
    .createSignedUploadUrl(storagePath)

  if (signError || !signed) {
    return apiError('STORAGE_ERROR', signError?.message ?? 'Failed to create signed upload URL', 500)
  }

  return Response.json({
    data: {
      signedUrl: signed.signedUrl,
      storagePath,
      artifactId,
    },
  })
}
