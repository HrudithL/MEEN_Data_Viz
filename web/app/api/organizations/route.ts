import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { apiError } from '@/lib/utils'
import { insertChangelog } from '@/lib/changelog'

// GET /api/organizations — list orgs user belongs to with role
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return apiError('UNAUTHORIZED', 'Not authenticated', 401)

  const { data, error } = await supabase
    .from('organization_members')
    .select('role, organizations(id, name, created_at, created_by)')
    .eq('user_id', user.id)

  if (error) return apiError('DB_ERROR', error.message, 500)

  const orgs = (data ?? []).map((row) => {
    const org = row.organizations as { id: string; name: string; created_at: string; created_by: string } | null
    return { ...org, role: row.role }
  }).filter(Boolean)

  return Response.json({ data: orgs })
}

// POST /api/organizations — create org
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return apiError('UNAUTHORIZED', 'Not authenticated', 401)

  const body = await req.json().catch(() => null)
  if (!body?.name?.trim()) return apiError('NAME_REQUIRED', 'Organization name is required')

  const serviceSb = createServiceClient()

  const { data: org, error: orgError } = await serviceSb
    .from('organizations')
    .insert({ name: body.name.trim(), created_by: user.id })
    .select()
    .single()

  if (orgError || !org) return apiError('DB_ERROR', orgError?.message ?? 'Failed to create org', 500)

  const { error: memberError } = await serviceSb
    .from('organization_members')
    .insert({ organization_id: org.id, user_id: user.id, role: 'admin', joined_at: new Date().toISOString() })

  if (memberError) return apiError('DB_ERROR', memberError.message, 500)

  await insertChangelog(serviceSb, {
    organizationId: org.id,
    userId: user.id,
    entityType: 'organization',
    entityId: org.id,
    action: 'create',
    metadata: { name: org.name },
  })

  return Response.json({ data: { ...org, role: 'admin' } }, { status: 201 })
}
