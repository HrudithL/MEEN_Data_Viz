import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { apiError } from '@/lib/utils'
import { insertChangelog } from '@/lib/changelog'
import type { PartNote } from '@/types/api'
import type { Json } from '@/types/database'

async function getPhaseContext(supabase: Awaited<ReturnType<typeof createClient>>, phaseId: string) {
  const { data } = await supabase
    .from('phases')
    .select('id, build_id, part_notes, builds!inner(organization_id)')
    .eq('id', phaseId)
    .single()
  if (!data) return null
  const orgId = (data.builds as { organization_id?: string })?.organization_id
  return {
    buildId: data.build_id as string,
    orgId: orgId ?? null,
    partNotes: (data.part_notes as PartNote[] | null) ?? [],
  }
}

// GET /api/phases/[phaseId]/part-notes
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ phaseId: string }> }
) {
  const { phaseId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return apiError('UNAUTHORIZED', 'Not authenticated', 401)

  const ctx = await getPhaseContext(supabase, phaseId)
  if (!ctx?.orgId) return apiError('NOT_FOUND', 'Phase not found', 404)

  const { data: canView } = await supabase.rpc('can_view_org', { p_org_id: ctx.orgId })
  if (!canView) return apiError('FORBIDDEN', 'Access denied', 403)

  return Response.json({ data: ctx.partNotes })
}

// PATCH /api/phases/[phaseId]/part-notes
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
  const action = body?.action as 'add' | 'update' | 'delete' | undefined

  let notes = [...ctx.partNotes]

  if (action === 'add') {
    const label = String(body?.label ?? '').trim()
    const text = String(body?.text ?? '').trim()
    if (!label || !text) return apiError('INVALID', 'Label and text are required')
    const now = new Date().toISOString()
    notes.push({
      id: crypto.randomUUID(),
      label,
      text,
      createdAt: now,
      updatedAt: now,
    })
  } else if (action === 'update') {
    const id = body?.id as string
    const text = String(body?.text ?? '').trim()
    if (!id || !text) return apiError('INVALID', 'Id and text are required')
    notes = notes.map(n =>
      n.id === id ? { ...n, text, updatedAt: new Date().toISOString() } : n
    )
  } else if (action === 'delete') {
    const id = body?.id as string
    if (!id) return apiError('INVALID', 'Id is required')
    notes = notes.filter(n => n.id !== id)
  } else {
    return apiError('INVALID', 'action must be add, update, or delete')
  }

  const serviceSb = createServiceClient()
  const { data: updated, error } = await serviceSb
    .from('phases')
    .update({ part_notes: notes as unknown as Json, updated_at: new Date().toISOString() })
    .eq('id', phaseId)
    .select('part_notes')
    .single()

  if (error) return apiError('DB_ERROR', error.message, 500)

  await insertChangelog(serviceSb, {
    organizationId: ctx.orgId,
    buildId: ctx.buildId,
    userId: user.id,
    entityType: 'notes',
    entityId: phaseId,
    action: 'update',
    metadata: { partNotes: true, action },
  })

  return Response.json({ data: updated?.part_notes ?? notes })
}
