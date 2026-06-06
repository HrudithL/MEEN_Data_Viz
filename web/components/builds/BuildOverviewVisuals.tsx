'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PHASE_IDS, PHASE_DISPLAY, FILE_TYPE_DISPLAY } from '@/lib/constants'
import { onBuildDataChanged } from '@/lib/build-data-events'

export type PhaseArtifactBreakdown = {
  phaseId: string
  total: number
  byType: Record<string, number>
}

interface BuildOverviewVisualsProps {
  buildId: string
  artifactBreakdown: PhaseArtifactBreakdown[]
}

const CHART_COLORS = [
  '#3b82f6', '#f97316', '#22c55e', '#a855f7', '#ef4444',
  '#06b6d4', '#eab308', '#ec4899', '#64748b', '#14b8a6',
]

export function BuildOverviewVisuals({ buildId, artifactBreakdown: initialBreakdown }: BuildOverviewVisualsProps) {
  const [artifactBreakdown, setArtifactBreakdown] = useState(initialBreakdown)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/builds/${buildId}/overview`, { cache: 'no-store' })
      if (!res.ok) return
      const json = await res.json()
      if (json.data?.artifactBreakdown) setArtifactBreakdown(json.data.artifactBreakdown)
    } catch {
      // ignore
    }
  }, [buildId])

  useEffect(() => onBuildDataChanged(buildId, refresh), [buildId, refresh])

  const allTypes = Array.from(
    new Set(artifactBreakdown.flatMap(p => Object.keys(p.byType)))
  ).sort()

  const chartData = PHASE_IDS.map(id => {
    const row = artifactBreakdown.find(p => p.phaseId === id)
    const entry: Record<string, string | number> = {
      name: PHASE_DISPLAY[id],
      fullName: PHASE_DISPLAY[id],
      total: row?.total ?? 0,
    }
    for (const t of allTypes) {
      entry[t] = row?.byType[t] ?? 0
    }
    return entry
  })

  const totalArtifacts = artifactBreakdown.reduce((sum, p) => sum + p.total, 0)

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          Artifacts by Phase
          <span className="text-sm font-normal text-muted-foreground">
            {totalArtifacts} total
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={420}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10 }}
              interval={0}
              angle={-35}
              textAnchor="end"
              height={70}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(v, name) => [v, FILE_TYPE_DISPLAY[name as string] ?? name]}
              labelFormatter={(_, payload) =>
                (payload?.[0]?.payload as { fullName?: string })?.fullName ?? ''
              }
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              formatter={value => FILE_TYPE_DISPLAY[value as string] ?? value}
            />
            {allTypes.map((type, i) => (
              <Bar
                key={type}
                dataKey={type}
                stackId="artifacts"
                fill={CHART_COLORS[i % CHART_COLORS.length]}
                radius={i === allTypes.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
        {allTypes.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No artifacts uploaded yet
          </p>
        )}
      </CardContent>
    </Card>
  )
}
