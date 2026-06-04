'use client'

import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { ViewerRegistry, type ViewerProps } from './ViewerRegistry'

interface CompactViewerProps extends ViewerProps {
  buildId?: string
  phaseId?: string
}

export function CompactViewer({ artifact, signedUrl, buildId, phaseId }: CompactViewerProps) {
  const byPhaseHref = buildId && phaseId
    ? `/builds/${buildId}/phases/${phaseId}`
    : buildId
    ? `/builds/${buildId}`
    : null

  return (
    <div className="space-y-2">
      <ViewerRegistry artifact={artifact} density="compact" signedUrl={signedUrl} />

      {byPhaseHref && (
        <div className="flex justify-end">
          <Link
            href={byPhaseHref}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors h-7 px-2 rounded"
          >
            View in By Phase
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  )
}
