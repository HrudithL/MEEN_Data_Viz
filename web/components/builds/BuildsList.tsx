'use client'

import { useCallback, useEffect, useState } from 'react'
import { BuildCard } from '@/components/builds/BuildCard'
import { BUILD_DATA_CHANGED } from '@/lib/build-data-events'
import type { BuildWithProgress } from '@/lib/queries/builds'

interface BuildsListProps {
  orgId: string
  initialBuilds: BuildWithProgress[]
  canDelete?: boolean
}

export function BuildsList({ orgId, initialBuilds, canDelete = false }: BuildsListProps) {
  const [builds, setBuilds] = useState(initialBuilds)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/builds?orgId=${encodeURIComponent(orgId)}`, {
        cache: 'no-store',
      })
      if (!res.ok) return
      const json = await res.json()
      setBuilds(json.data ?? [])
    } catch {
      // ignore
    }
  }, [orgId])

  useEffect(() => {
    const onChanged = () => void refresh()
    const onFocus = () => void refresh()
    window.addEventListener(BUILD_DATA_CHANGED, onChanged)
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener(BUILD_DATA_CHANGED, onChanged)
      window.removeEventListener('focus', onFocus)
    }
  }, [refresh])

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {builds.map(build => (
        <BuildCard
          key={build.id}
          build={build}
          canDelete={canDelete}
          onDeleted={() => setBuilds(prev => prev.filter(b => b.id !== build.id))}
        />
      ))}
    </div>
  )
}
