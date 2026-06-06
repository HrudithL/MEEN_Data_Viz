'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Builds</CardTitle>
        <CardDescription>Latest experiment builds and progress</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {builds.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No builds yet</p>
        ) : (
          <ul className="divide-y">
            {builds.map(build => (
              <li key={build.id}>
                <Link
                  href={`/builds/${build.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{build.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {build.artifactCount} artifacts · {build.completedPhases}/{PHASE_IDS.length} phases ·{' '}
                      {formatDistanceToNow(new Date(build.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs shrink-0',
                      build.status === 'complete'
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : 'border-blue-200 bg-blue-50 text-blue-700'
                    )}
                  >
                    {build.status === 'complete' ? 'Complete' : 'In Progress'}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
