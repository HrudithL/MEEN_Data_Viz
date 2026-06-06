import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/utils'
import { getBuildsForOrg } from '@/lib/queries/builds'

// GET /api/builds?orgId=...
export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get('orgId')
  if (!orgId) return apiError('BAD_REQUEST', 'orgId query parameter required', 400)

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return apiError('UNAUTHORIZED', 'Not authenticated', 401)

  const builds = await getBuildsForOrg(orgId)
  return Response.json({ data: builds })
}
