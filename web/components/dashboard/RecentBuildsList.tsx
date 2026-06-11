'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Stagger } from '@/components/motion'
import { PHASE_IDS } from '@/lib/constants'

interface RecentBuild {
    id: string
    name: string
    status: string
    created_at: string
    completedPhases: number
    artifactCount: number
}

interface RecentBuildsListProps {
    builds: RecentBuild[]
}

export function RecentBuildsList({ builds }: RecentBuildsListProps) {
    return (
        <Card className="border-border/60">
            <CardHeader>
                <CardTitle className="text-base">Recent Builds</CardTitle>
                <CardDescription>Latest experiment builds and progress</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                {builds.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No builds yet</p>
                ) : (
                    <Stagger className="divide-y divide-border/50" staggerMs={50} baseDelayMs={100}>
                        {builds.map(build => (
                            <li key={build.id}>
                                <Link
                                    href={`/builds/${build.id}`}
                                    className="flex items-center gap-3 px-5 py-3.5 interactive-surface group"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                            {build.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {build.artifactCount} artifacts · {build.completedPhases}/{PHASE_IDS.length} phases ·{' '}
                                            {formatDistanceToNow(new Date(build.created_at), { addSuffix: true })}
                                        </p>
                                    </div>
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            'text-xs shrink-0',
                                            build.status === 'complete'
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                        )}
                                    >
                                        {build.status === 'complete' ? 'Complete' : 'In Progress'}
                                    </Badge>
                                </Link>
                            </li>
                        ))}
                    </Stagger>
                )}
            </CardContent>
        </Card>
    )
}
