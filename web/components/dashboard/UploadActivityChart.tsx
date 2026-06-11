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
import { format } from 'date-fns'

interface UploadActivityChartProps {
    uploadsByDay: { date: string; count: number }[]
}

export function UploadActivityChart({ uploadsByDay }: UploadActivityChartProps) {
    const data = uploadsByDay.map((d, index) => ({
        ...d,
        index,
        label: format(new Date(`${d.date}T12:00:00`), 'MMM d'),
    }))

    return (
        <Card className="border-border/60">
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
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(224, 35%, 16%)" />
                            <XAxis
                                dataKey="index"
                                type="number"
                                domain={[0, data.length - 1]}
                                ticks={data.map(d => d.index)}
                                tickFormatter={index => data[index]?.label ?? ''}
                                tick={{ fontSize: 9, fill: 'hsl(215, 16%, 47%)' }}
                                interval={0}
                                angle={-35}
                                textAnchor="end"
                                height={50}
                                axisLine={{ stroke: 'hsl(224, 35%, 16%)' }}
                                tickLine={false}
                            />
                            <YAxis
                                allowDecimals={false}
                                tick={{ fontSize: 11, fill: 'hsl(215, 16%, 47%)' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(223, 43%, 8%)',
                                    border: '1px solid hsl(224, 35%, 16%)',
                                    borderRadius: '8px',
                                    fontSize: 12,
                                    color: 'hsl(214, 32%, 91%)',
                                }}
                                cursor={{ fill: 'hsl(224, 35%, 16%)' }}
                            />
                            <Bar
                                dataKey="count"
                                fill="hsl(160, 62%, 52%)"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={32}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    )
}
