import type { SupabaseClient } from '@supabase/supabase-js'
import type { ChangelogAction, ChangelogEntity } from '@/types/database'

export async function insertChangelog(
  supabase: SupabaseClient,
  params: {
    organizationId: string
    buildId?: string
    userId: string
    entityType: ChangelogEntity
    entityId?: string
    action: ChangelogAction
    diff?: unknown
    metadata?: unknown
  }
): Promise<void> {
  await supabase.from('changelog').insert({
    organization_id: params.organizationId,
    build_id: params.buildId ?? null,
    user_id: params.userId,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    action: params.action,
    diff: params.diff ?? null,
    metadata: params.metadata ?? null,
  })
}
