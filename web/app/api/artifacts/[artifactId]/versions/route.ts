import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { apiError, isRejectedExtension } from '@/lib/utils'
import { insertChangelog } from '@/lib/changelog'
import { parseArtifact } from '@/lib/parsers'
import { PHASE_ACCEPTED_TYPES } from '@/lib/constants'
import type { PhaseIdEnum } from '@/types/database'

async function getArtifactContext(supabase: Awaited<ReturnType<typeof createClient>>, artifactId: string) {
  const { data } = await supabase
    .from('artifacts')
    .select('*, phases!inner(id, phase, build_id, builds!inner(organization_id))')
    .eq('id', artifactId)
    .single()
  if (!data) return null
  const phase = data.phases as any
  return {
    artifact: data,
    phaseId: phase?.id as string,
    phaseType: phase?.phase as PhaseIdEnum,
    buildId: phase?.build_id as string,
    orgId: phase?.builds?.organization_id as string,
  }
}

// GET /api/artifacts/[artifactId]/versions
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ artifactId: string }> }
) {
  const { artifactId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return apiError('UNAUTHORIZED', 'Not authenticated', 401)

  const ctx = await getArtifactContext(supabase, artifactId)
  if (!ctx) return apiError('NOT_FOUND', 'Artifact not found', 404)

  const { data: canView } = await supabase.rpc('can_view_org', { p_org_id: ctx.orgId })
  if (!canView) return apiError('FORBIDDEN', 'Access denied', 403)

  const { data: versions, error } = await supabase
    .from('artifact_versions')
    .select('id, version_number, created_at, file_name, parse_status, file_size')
    .eq('artifact_id', artifactId)
    .order('version_number', { ascending: false })

  if (error) return apiError('DB_ERROR', error.message, 500)

  return Response.json({ data: versions ?? [] })
}

// POST /api/artifacts/[artifactId]/versions — new file version
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ artifactId: string }> }
) {
  const { artifactId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return apiError('UNAUTHORIZED', 'Not authenticated', 401)

  const ctx = await getArtifactContext(supabase, artifactId)
  if (!ctx) return apiError('NOT_FOUND', 'Artifact not found', 404)

  const { data: canEdit } = await supabase.rpc('can_edit_org', { p_org_id: ctx.orgId })
  if (!canEdit) return apiError('FORBIDDEN', 'Editor or admin required', 403)

  const body = await req.json().catch(() => null)
  const { label, fileType, storagePath, fileName, fileSize, sha256, metadata, ebsdFormat } = body ?? {}

  if (!label?.trim()) return apiError('LABEL_REQUIRED', 'Label is required')
  if (isRejectedExtension(fileName ?? '')) {
    return apiError('UNSUPPORTED_FORMAT', 'Excel files (.xlsx, .xls) are not supported', 400)
  }

  const accepted = PHASE_ACCEPTED_TYPES[ctx.phaseType] ?? []
  if (!accepted.includes(fileType)) {
    return apiError('INVALID_FILE_TYPE', `Phase does not accept file type ${fileType}`)
  }

  const serviceSb = createServiceClient()
  const nextVersion = ctx.artifact.current_version + 1

  // Insert new version
  const { data: version, error: versionError } = await serviceSb
    .from('artifact_versions')
    .insert({
      artifact_id: artifactId,
      version_number: nextVersion,
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
    .select()
    .single()

  if (versionError || !version) {
    return apiError('DB_ERROR', versionError?.message ?? 'Failed to create version', 500)
  }

  // Download and parse
  try {
    const { data: fileData, error: downloadError } = await serviceSb.storage
      .from('build-artifacts')
      .download(storagePath)

    if (!downloadError && fileData) {
      const buffer = Buffer.from(await fileData.arrayBuffer())
      const parseResult = await parseArtifact(buffer, fileType, { ebsdFormat })

      await serviceSb
        .from('artifact_versions')
        .update({
          parsed_json: parseResult.parsedJson as any,
          column_dictionary: parseResult.columnDictionary as any ?? null,
          parse_status: parseResult.parseStatus,
        })
        .eq('id', version.id)

      // Update artifact to current version
      await serviceSb
        .from('artifacts')
        .update({
          current_version: nextVersion,
          storage_path: storagePath,
          file_name: fileName,
          file_size: fileSize ?? 0,
          sha256: sha256 ?? null,
          label: label.trim(),
          metadata: metadata ?? ctx.artifact.metadata,
          parsed_json: parseResult.parsedJson as any,
          column_dictionary: parseResult.columnDictionary as any ?? null,
          parse_status: parseResult.parseStatus,
        })
        .eq('id', artifactId)
    }
  } catch (parseErr) {
    console.error('Parse error for new version:', parseErr)
    await serviceSb
      .from('artifacts')
      .update({ current_version: nextVersion, storage_path: storagePath, file_name: fileName })
      .eq('id', artifactId)
  }

  await insertChangelog(serviceSb, {
    organizationId: ctx.orgId,
    buildId: ctx.buildId,
    userId: user.id,
    entityType: 'artifact_version',
    entityId: version.id,
    action: 'version_create',
    metadata: { artifactId, version: nextVersion, fileName },
  })

  return Response.json({ data: version }, { status: 201 })
}
