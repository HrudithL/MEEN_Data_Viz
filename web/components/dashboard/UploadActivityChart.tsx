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
import { format, parseISO } from 'date-fns'

interface UploadActivityChartProps {
  uploadsByDay: { date: string; count: number }[]
}

export function UploadActivityChart({ uploadsByDay }: UploadActivityChartProps) {
  const data = uploadsByDay.map((d, index) => ({
    ...d,
    index,
    label: format(parseISO(d.date), 'MMM d'),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upload Activity</CardTitle>
        <CardDescription>Artifact uploads over the last 14 days</CardDescription>
      </CardHeader>
      <CardContent>
        {data.every(d => d.count === 0) ? (
          <p className="text-sm text-muted-foreground text-center py-8">No recent uploads</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="index"
                type="number"
                domain={[0, data.length - 1]}
                ticks={data.map(d => d.index)}
                tickFormatter={index => data[index]?.label ?? ''}
                tick={{ fontSize: 9 }}
                interval={0}
                angle={-35}
                textAnchor="end"
                height={50}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
