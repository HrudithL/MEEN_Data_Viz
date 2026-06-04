import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { apiError } from '@/lib/utils'
import { insertChangelog } from '@/lib/changelog'
import type { NotesJson } from '@/types/database'

async function getPhaseContext(supabase: Awaited<ReturnType<typeof createClient>>, phaseId: string) {
  const { data } = await supabase
    .from('phases')
    .select('id, build_id, builds!inner(organization_id)')
    .eq('id', phaseId)
    .single()
  if (!data) return null
  const orgId = (data.builds as any)?.organization_id as string | undefined
  return { buildId: data.build_id, orgId: orgId ?? null }
}

// PATCH /api/phases/[phaseId]/notes
export async function PATCH(
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
  const notesJson = body?.notes_json as NotesJson | undefined

  if (!notesJson || notesJson.format !== 'richtext_v1' || !Array.isArray(notesJson.blocks)) {
    return apiError('INVALID_FORMAT', 'notes_json must be richtext_v1 format with blocks array')
  }

  for (const block of notesJson.blocks) {
    if (!['paragraph', 'bullet'].includes(block.type)) {
      return apiError('INVALID_FORMAT', `Invalid block type: ${block.type}`)
    }
    if (typeof block.text !== 'string') {
      return apiError('INVALID_FORMAT', 'Each block must have a text string')
    }
  }

  const { data: updated, error } = await supabase
    .from('phases')
    .update({ notes_json: notesJson as any, updated_at: new Date().toISOString() })
    .eq('id', phaseId)
    .select()
    .single()

  if (error) return apiError('DB_ERROR', error.message, 500)

  const serviceSb = createServiceClient()
  await insertChangelog(serviceSb, {
    organizationId: ctx.orgId,
    buildId: ctx.buildId,
    userId: user.id,
    entityType: 'notes',
    entityId: phaseId,
    action: 'update',
  })

  return Response.json({ data: updated })
}
