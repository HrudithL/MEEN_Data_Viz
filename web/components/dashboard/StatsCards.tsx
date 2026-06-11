'use client'

import { FlaskConical, CheckCircle2, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Stagger } from '@/components/motion'

interface StatsCardsProps {
    totalBuilds: number
    completeBuilds: number
    inProgressBuilds: number
}

export function StatsCards({ totalBuilds, completeBuilds, inProgressBuilds }: StatsCardsProps) {
    const stats = [
        {
            title: 'Total Builds',
            value: totalBuilds,
            icon: FlaskConical,
            description: 'All experiment builds',
        },
        {
            title: 'Complete',
            value: completeBuilds,
            icon: CheckCircle2,
            description: 'All 9 phases done',
        },
        {
            title: 'In Progress',
            value: inProgressBuilds,
            icon: Clock,
            description: 'Partially complete',
        },
    ]

    return (
        <Stagger className="grid gap-4 md:grid-cols-3" staggerMs={80}>
            {stats.map(stat => (
                <Card key={stat.title} className="relative overflow-hidden interactive-card hover:border-primary/20">
                    <div className="absolute top-0 left-0 right-0 h-px gradient-coral opacity-40" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {stat.title}
                        </CardTitle>
                        <div className="p-2 rounded-lg icon-box-coral">
                            <stat.icon className="h-4 w-4 text-primary" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold tabular-nums">{stat.value}</div>
                        <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                    </CardContent>
                </Card>
            ))}
        </Stagger>
    )
}
