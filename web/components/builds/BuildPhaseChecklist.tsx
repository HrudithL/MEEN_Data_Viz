'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { PHASE_DISPLAY, PHASE_IDS } from '@/lib/constants'
import { onBuildDataChanged } from '@/lib/build-data-events'

interface BuildPhaseChecklistProps {
  buildId: string
  initialCompletion: Record<string, boolean>
  initialCompletedCount: number
}

export function BuildPhaseChecklist({
  buildId,
  initialCompletion,
  initialCompletedCount,
}: BuildPhaseChecklistProps) {
  const [phaseCompletion, setPhaseCompletion] = useState(initialCompletion)
  const [completedCount, setCompletedCount] = useState(initialCompletedCount)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/builds/${buildId}/overview`, { cache: 'no-store' })
      if (!res.ok) return
      const json = await res.json()
      setPhaseCompletion(json.data?.phaseCompletion ?? {})
      setCompletedCount(json.data?.completedPhases ?? 0)
    } catch {
      // ignore
    }
  }, [buildId])

  useEffect(() => onBuildDataChanged(buildId, refresh), [buildId, refresh])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Phase Checklist
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {completedCount}/{PHASE_IDS.length} complete
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y">
          {PHASE_IDS.map((phaseId, index) => {
            const isComplete = phaseCompletion[phaseId] ?? false
            return (
              <li
                key={phaseId}
                className="flex items-center gap-3 px-5 py-2.5 hover:bg-muted/30 transition-colors"
              >
                <span className="text-xs text-muted-foreground w-4 shrink-0">
                  {index + 1}
                </span>
                {isComplete ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <Link
                  href={`/builds/${buildId}/data`}
                  className={cn(
                    'text-sm flex-1 hover:underline',
                    isComplete ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {PHASE_DISPLAY[phaseId]}
                </Link>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
