'use client'

import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import type { OrgWithRole } from '@/types/api'

const ORG_KEY = 'meen_active_org'

export function useOrg(orgs: OrgWithRole[] = []) {
  const params = useParams()
  const router = useRouter()

  const getInitialOrgId = useCallback((): string | null => {
    // URL param takes priority
    if (params?.orgId && typeof params.orgId === 'string') return params.orgId
    // Then localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(ORG_KEY)
      if (stored && orgs.some(o => o.id === stored)) return stored
    }
    // Default to first org
    return orgs[0]?.id ?? null
  }, [params?.orgId, orgs])

  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(getInitialOrgId)

  useEffect(() => {
    const id = getInitialOrgId()
    if (id) setActiveOrgIdState(id)
  }, [getInitialOrgId])

  const setActiveOrgId = useCallback((id: string) => {
    setActiveOrgIdState(id)
    if (typeof window !== 'undefined') {
      localStorage.setItem(ORG_KEY, id)
    }
  }, [])

  const activeOrg = orgs.find(o => o.id === activeOrgId) ?? orgs[0] ?? null
  const userRole = activeOrg?.role ?? null
  const canEdit = userRole === 'admin' || userRole === 'editor'
  const isAdmin = userRole === 'admin'

  return { activeOrg, activeOrgId: activeOrg?.id ?? null, setActiveOrgId, userRole, canEdit, isAdmin }
}
