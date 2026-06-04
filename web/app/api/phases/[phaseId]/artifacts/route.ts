import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { apiError, isRejectedExtension } from '@/lib/utils'
import { insertChangelog } from '@/lib/changelog'
import { recomputeBuildStatus } from '@/lib/build-status'
import { parseArtifact } from '@/lib/parsers'
import { PHASE_ACCEPTED_TYPES } from '@/lib/constants'
import type { PhaseIdEnum } from '@/types/database'

async function getPhaseContext(supabase: Awaited<ReturnType<typeof createClient>>, phaseId: string) {
  const { data } = await supabase
    .from('phases')
    .select('id, phase, build_id, builds!inner(organization_id)')
    .eq('id', phaseId)
    .single()
  if (!data) return null
  const orgId = (data.builds as any)?.organization_id as string | undefined
  return { buildId: data.build_id, orgId: orgId ?? null, phaseType: data.phase as PhaseIdEnum }
}

// POST /api/phases/[phaseId]/artifacts — register artifact after client PUT
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ phaseId: string }> }
) {
  const { phaseId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return apiError('UNAUTHORIZED', 'Not authenticated', 401)

  const ctx = await getPhaseContext(supabase, phaseId)
  if (!ctx?.orgId) return apiError('NOT_FOUND', 'Phase not found', 404)

  const { data: canEdit } = await supabase.rpc('can_edit_org', { p_org_id: ctx.orgId })
  if (!canEdit) return apiError('FORBIDDEN', 'Editor or admin required', 403)

  const body = await req.json().catch(() => null)
  const { label, fileType, storagePath, fileName, fileSize, sha256, metadata, ebsdFormat } = body ?? {}

  if (!label?.trim()) return apiError('LABEL_REQUIRED', 'Label is required')
  if (isRejectedExtension(fileName ?? '')) {
    return apiError('UNSUPPORTED_FORMAT', 'Excel files (.xlsx, .xls) are not supported', 400)
  }

  // Validate file type for this phase
  const accepted = PHASE_ACCEPTED_TYPES[ctx.phaseType] ?? []
  if (!accepted.includes(fileType)) {
    return apiError(
      'INVALID_FILE_TYPE',
      `Phase ${ctx.phaseType} does not accept file type ${fileType}. Accepted: ${accepted.join(', ')}`
    )
  }

  const serviceSb = createServiceClient()

  // Insert artifact row
  const { data: artifact, error: insertError } = await serviceSb
    .from('artifacts')
    .insert({
      phase_id: phaseId,
      label: label.trim(),
      file_type: fileType,
      storage_path: storagePath,
      file_name: fileName,
      file_size: fileSize ?? 0,
      mime_type: null,
      sha256: sha256 ?? null,
      parsed_json: null,
      column_dictionary: null,
      parse_status: 'failed' as const,
      metadata: metadata ?? {},
      uploaded_by: user.id,
    })
    .select()
    .single()

  if (insertError || !artifact) {
    return apiError('DB_ERROR', insertError?.message ?? 'Failed to insert artifact', 500)
  }

  // Insert version 1
  await serviceSb.from('artifact_versions').insert({
    artifact_id: artifact.id,
    version_number: 1,
    storage_path: storagePath,
    file_name: fileName,
    file_size: fileSize ?? 0,
    sha256: sha256 ?? null,
    parsed_json: null,
    column_dictionary: null,
    parse_status: 'failed' as const,
    metadata: metadata ?? {},
    created_by: user.id,
  })

  // Download and parse file
  let parseResult = null
  try {
    const { data: fileData, error: downloadError } = await serviceSb.storage
      .from('build-artifacts')
      .download(storagePath)

    if (!downloadError && fileData) {
      const buffer = Buffer.from(await fileData.arrayBuffer())
      parseResult = await parseArtifact(buffer, fileType, { ebsdFormat })

      await serviceSb
        .from('artifacts')
        .update({
          parsed_json: parseResult.parsedJson as any,
          column_dictionary: parseResult.columnDictionary as any ?? null,
          parse_status: parseResult.parseStatus,
          current_version: 1,
        })
        .eq('id', artifact.id)

      await serviceSb
        .from('artifact_versions')
        .update({
          parsed_json: parseResult.parsedJson as any,
          column_dictionary: parseResult.columnDictionary as any ?? null,
          parse_status: parseResult.parseStatus,
        })
        .eq('artifact_id', artifact.id)
        .eq('version_number', 1)
    }
  } catch (parseErr) {
    console.error('Parse error:', parseErr)
  }

  // Recompute build status
  await recomputeBuildStatus(serviceSb, ctx.buildId)

  await insertChangelog(serviceSb, {
    organizationId: ctx.orgId,
    buildId: ctx.buildId,
    userId: user.id,
    entityType: 'artifact',
    entityId: artifact.id,
    action: 'create',
    metadata: { label, fileType, fileName },
  })

  const { data: finalArtifact } = await serviceSb
    .from('artifacts')
    .select('*')
    .eq('id', artifact.id)
    .single()

  return Response.json({ data: finalArtifact ?? artifact }, { status: 201 })
}
