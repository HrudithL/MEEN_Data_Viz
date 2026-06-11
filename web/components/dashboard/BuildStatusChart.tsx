'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface BuildStatusChartProps {
    completeBuilds: number
    inProgressBuilds: number
}

const COLORS = ['hsl(234, 89%, 74%)', 'hsl(215, 16%, 32%)']

export function BuildStatusChart({ completeBuilds, inProgressBuilds }: BuildStatusChartProps) {
    const data = [
        { name: 'Complete', value: completeBuilds },
        { name: 'In Progress', value: inProgressBuilds },
    ].filter(d => d.value > 0)

    if (data.length === 0) {
        return (
            <Card className="border-border/60">
                <CardHeader>
                    <CardTitle className="text-base">Build Status</CardTitle>
                    <CardDescription>No builds to display</CardDescription>
                </CardHeader>
            </Card>
        )
    }

    return (
        <Card className="border-border/60">
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
                            paddingAngle={3}
                        >
                            {data.map((_, i) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(223, 43%, 8%)',
                                border: '1px solid hsl(224, 35%, 16%)',
                                borderRadius: '8px',
                                fontSize: 12,
                                color: 'hsl(214, 32%, 91%)',
                            }}
                        />
                        <Legend
                            wrapperStyle={{ fontSize: 12, color: 'hsl(215, 16%, 47%)' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
