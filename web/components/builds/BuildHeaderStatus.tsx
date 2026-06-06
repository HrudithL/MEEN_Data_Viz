'use client'

import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { onBuildDataChanged } from '@/lib/build-data-events'

interface BuildHeaderStatusProps {
  buildId: string
  initialStatus: string
  initialCompletedPhases: number
  totalPhases: number
  material?: string | null
  process?: string | null
}

export function BuildHeaderStatus({
  buildId,
  initialStatus,
  initialCompletedPhases,
  totalPhases,
  material,
  process,
}: BuildHeaderStatusProps) {
  const [status, setStatus] = useState(initialStatus)
  const [completedPhases, setCompletedPhases] = useState(initialCompletedPhases)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/builds/${buildId}/overview`, { cache: 'no-store' })
      if (!res.ok) return
      const json = await res.json()
      if (json.data?.status) setStatus(json.data.status)
      if (typeof json.data?.completedPhases === 'number') {
        setCompletedPhases(json.data.completedPhases)
      }
    } catch {
      // ignore
    }
  }, [buildId])

  useEffect(() => onBuildDataChanged(buildId, refresh), [buildId, refresh])

  return (
    <div className="flex items-center gap-3 mt-1 flex-wrap">
      <Badge
        variant="outline"
        className={cn(
          'text-xs',
          status === 'complete'
            ? 'border-green-200 bg-green-50 text-green-700'
            : 'border-blue-200 bg-blue-50 text-blue-700'
        )}
      >
        {status === 'complete' ? 'Complete' : 'In Progress'}
      </Badge>
      {material && (
        <span className="text-xs text-muted-foreground">Material: {material}</span>
      )}
      {process && (
        <span className="text-xs text-muted-foreground">Process: {process}</span>
      )}
      <span className="text-xs text-muted-foreground">
        {completedPhases}/{totalPhases} phases complete
      </span>
    </div>
  )
}
