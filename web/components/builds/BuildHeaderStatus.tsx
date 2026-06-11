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
        <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
            <Badge
                variant="outline"
                className={cn(
                    'text-xs',
                    status === 'complete'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                )}
            >
                {status === 'complete' ? 'Complete' : 'In Progress'}
            </Badge>
            {material && (
                <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                    Material: {material}
                </span>
            )}
            {process && (
                <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                    Process: {process}
                </span>
            )}
            <span className="text-xs text-muted-foreground tabular-nums">
                {completedPhases}/{totalPhases} phases complete
            </span>
        </div>
    )
}
