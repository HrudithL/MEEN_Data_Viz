'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Stagger } from '@/components/motion'
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
        <Card className="border-border/60">
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    Phase Checklist
                    <span className="text-sm font-normal text-muted-foreground tabular-nums">
                        {completedCount}/{PHASE_IDS.length}
                    </span>
                    <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden ml-1">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500"
                            style={{ width: `${(completedCount / PHASE_IDS.length) * 100}%` }}
                        />
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Stagger className="divide-y divide-border/50" staggerMs={35}>
                    {PHASE_IDS.map((phaseId, index) => {
                        const isComplete = phaseCompletion[phaseId] ?? false
                        return (
                            <li
                                key={phaseId}
                                className="flex items-center gap-3 px-5 py-2.5 interactive-surface"
                            >
                                <span className="text-xs text-muted-foreground w-4 shrink-0 tabular-nums">
                                    {index + 1}
                                </span>
                                {isComplete ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                                ) : (
                                    <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                                )}
                                <Link
                                    href={`/builds/${buildId}/data`}
                                    className={cn(
                                        'text-sm flex-1 hover:underline underline-offset-2 transition-colors',
                                        isComplete ? 'text-foreground' : 'text-muted-foreground'
                                    )}
                                >
                                    {PHASE_DISPLAY[phaseId]}
                                </Link>
                            </li>
                        )
                    })}
                </Stagger>
            </CardContent>
        </Card>
    )
}
