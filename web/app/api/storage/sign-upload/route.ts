import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { apiError, isReferenceExtensionAllowed, isRejectedExtension } from '@/lib/utils'
import { MAX_UPLOAD_BYTES } from '@/lib/constants'
import { randomUUID } from 'crypto'

// POST /api/storage/sign-upload
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return apiError('UNAUTHORIZED', 'Not authenticated', 401)

  const body = await req.json().catch(() => null)
  const { orgId, buildId, phaseId, fileName, fileSize, mimeType, reference, notesImage, notesFile } = body ?? {}

  if (!orgId || !buildId || !fileName) {
    return apiError('MISSING_FIELDS', 'orgId, buildId, and fileName are required')
  }

  const isReferenceUpload = reference === true
  const isNotesImage = notesImage === true
  const isNotesFile = notesFile === true

  if (!isReferenceUpload && !isNotesImage && !isNotesFile && !phaseId) {
    return apiError('MISSING_FIELDS', 'phaseId is required for phase artifact uploads')
  }

  if ((isNotesImage || isNotesFile) && !phaseId) {
    return apiError('MISSING_FIELDS', 'phaseId is required for notes uploads')
  }

  if (isNotesFile && !String(fileName).match(/\.(md|txt)$/i)) {
    return apiError('UNSUPPORTED_FORMAT', 'Notes files must be .md or .txt', 400)
  }

  if (isNotesImage && !String(fileName).match(/\.(png|jpe?g|gif|webp)$/i)) {
    return apiError('UNSUPPORTED_FORMAT', 'Notes images must be PNG, JPEG, GIF, or WebP', 400)
  }

  if (isReferenceUpload && !isReferenceExtensionAllowed(fileName)) {
    return apiError('UNSUPPORTED_FORMAT', 'File type not allowed for project reference uploads', 400)
  }

  if (!isReferenceUpload && !isNotesImage && !isNotesFile && isRejectedExtension(fileName)) {
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

  const fileId = randomUUID()
  const storagePath = isReferenceUpload
    ? `org/${orgId}/build/${buildId}/reference/${fileId}/v1/${fileName}`
    : isNotesImage || isNotesFile
      ? `org/${orgId}/build/${buildId}/phase/${phaseId}/notes/${fileId}/${fileName}`
      : `org/${orgId}/build/${buildId}/phase/${phaseId}/artifact/${fileId}/v1/${fileName}`

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
      artifactId: fileId,
      referenceId: isReferenceUpload ? fileId : undefined,
    },
  })
}
