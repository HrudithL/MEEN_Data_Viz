'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ArrowRight, Beaker, GitBranch, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PHASE_IDS } from '@/lib/constants'
import { DeleteBuildDialog } from '@/components/builds/DeleteBuildDialog'
import type { Build } from '@/types/database'

interface BuildCardProps {
  build: Build & { completedPhases?: number; phaseCompletion?: boolean[] }
  canDelete?: boolean
  onDeleted?: () => void
}

export function BuildCard({ build, canDelete = false, onDeleted }: BuildCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const completedCount = build.completedPhases ?? 0
  const totalPhases = PHASE_IDS.length
  const phaseCompletion = build.phaseCompletion ?? PHASE_IDS.map((_, i) => i < completedCount)

  function getTimeAgo(dateStr: string) {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
    } catch {
      return dateStr
    }
  }

  return (
    <>
      <Card className="group hover:shadow-md transition-all hover:border-primary/40 relative">
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            title="Delete build"
            onClick={e => {
              e.preventDefault()
              e.stopPropagation()
              setDeleteOpen(true)
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}

        <Link href={`/builds/${build.id}`} className="block">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 pr-6">
                <div className="p-1.5 bg-primary/10 rounded-md shrink-0">
                  <Beaker className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold text-sm leading-tight truncate group-hover:text-primary transition-colors">
                  {build.name}
                </h3>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  'shrink-0 text-xs',
                  build.status === 'complete'
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-blue-200 bg-blue-50 text-blue-700'
                )}
              >
                {build.status === 'complete' ? 'Complete' : 'In Progress'}
              </Badge>
            </div>
            {build.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 ml-9">
                {build.description}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {(build.material || build.process) && (
              <div className="flex gap-3 text-xs text-muted-foreground">
                {build.material && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Material:</span> {build.material}
                  </div>
                )}
                {build.process && (
                  <div className="flex items-center gap-1">
                    <GitBranch className="h-3 w-3" />
                    {build.process}
                  </div>
                )}
              </div>
            )}

            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Phases</span>
                <span>{completedCount}/{totalPhases}</span>
              </div>
              <div className="flex gap-0.5">
                {PHASE_IDS.map((phaseId, index) => (
                  <div
                    key={phaseId}
                    title={phaseId}
                    className={cn(
                      'h-1.5 flex-1 rounded-sm transition-colors',
                      phaseCompletion[index] ? 'bg-primary' : 'bg-muted'
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>Created {getTimeAgo(build.created_at)}</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </CardContent>
        </Link>
      </Card>

      {canDelete && (
        <DeleteBuildDialog
          buildId={build.id}
          buildName={build.name}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onDeleted={onDeleted}
        />
      )}
    </>
  )
}
