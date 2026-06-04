'use client'

import { FlaskConical, CheckCircle2, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Complete',
      value: completeBuilds,
      icon: CheckCircle2,
      description: 'All 9 phases done',
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      title: 'In Progress',
      value: inProgressBuilds,
      icon: Clock,
      description: 'Partially complete',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map(stat => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-md ${stat.bg}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
