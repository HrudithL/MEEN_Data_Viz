'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface BuildStatusChartProps {
  completeBuilds: number
  inProgressBuilds: number
}

const COLORS = ['hsl(var(--primary))', '#94a3b8']

export function BuildStatusChart({ completeBuilds, inProgressBuilds }: BuildStatusChartProps) {
  const data = [
    { name: 'Complete', value: completeBuilds },
    { name: 'In Progress', value: inProgressBuilds },
  ].filter(d => d.value > 0)

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Build Status</CardTitle>
          <CardDescription>No builds to display</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Build Status</CardTitle>
        <CardDescription>Complete vs in-progress builds</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={75}
              paddingAngle={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
