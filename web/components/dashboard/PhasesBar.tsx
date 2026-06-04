'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { PHASE_IDS, PHASE_DISPLAY } from '@/lib/constants'

interface PhasesBarProps {
  phasesCompleted: number[]
}

export function PhasesBar({ phasesCompleted }: PhasesBarProps) {
  const data = PHASE_IDS.map((id, index) => ({
    name: PHASE_DISPLAY[id]
      .split(' ')
      .map(w => w.slice(0, 4))
      .join(' '),
    fullName: PHASE_DISPLAY[id],
    count: phasesCompleted[index] ?? 0,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Phase Completion</CardTitle>
        <CardDescription>Number of builds with each phase completed</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
            />
            <Tooltip
              formatter={(value, _name, props) => [value, props.payload?.fullName ?? 'Count']}
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 'var(--radius)',
                fontSize: 12,
              }}
            />
            <Bar
              dataKey="count"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
              maxBarSize={48}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
