'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import { PHASE_DISPLAY } from '@/lib/constants'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { FILE_TYPE_DISPLAY } from '@/lib/constants'
import type { VizPhase, ArtifactSummary } from '@/types/api'
import type { PhaseIdEnum } from '@/types/database'
import type { ArtifactSummary as ViewerArtifactSummary } from '@/components/viewers/ViewerRegistry'

const CompactViewer = dynamic(
  () => import('@/components/viewers/CompactViewer').then(m => m.CompactViewer),
  {
    ssr: false,
    loading: () => (
      <div className="h-20 flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    ),
  }
)

interface PhaseCellProps {
  vizPhase: VizPhase
  phaseKey: PhaseIdEnum
}

interface FullArtifact {
  id: string
  file_type: string
  storage_path: string
  file_name: string
  parsed_json: unknown
  parse_status: string
}

export function PhaseCell({ vizPhase, phaseKey }: PhaseCellProps) {
  return (
    <div className="border rounded-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div
        className={cn(
          'px-3 py-2 border-b text-xs font-semibold flex items-center justify-between',
          vizPhase.isComplete ? 'bg-green-50 text-green-800' : 'bg-muted/40 text-muted-foreground'
        )}
      >
        <span>{PHASE_DISPLAY[phaseKey]}</span>
        {vizPhase.isComplete && <span className="text-green-600">&#10003;</span>}
      </div>

      {/* Artifact list */}
      <div className="flex-1 divide-y overflow-y-auto max-h-[320px]">
        {vizPhase.artifacts.length === 0 ? (
          <div className="flex items-center justify-center h-16 text-xs text-muted-foreground">
            No data
          </div>
        ) : (
          vizPhase.artifacts.map(artifact => (
            <ArtifactCompactCell key={artifact.id} artifact={artifact} />
          ))
        )}
      </div>
    </div>
  )
}

function ArtifactCompactCell({ artifact }: { artifact: ArtifactSummary }) {
  const [expanded, setExpanded] = useState(false)
  const [fullArtifact, setFullArtifact] = useState<FullArtifact | null>(null)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleExpand() {
    if (expanded) {
      setExpanded(false)
      return
    }
    setExpanded(true)
    if (fullArtifact) return
    setLoading(true)
    try {
      const artRes = await fetch(`/api/artifacts/${artifact.id}`)
      const artJson = await artRes.json()
      const art: FullArtifact = artJson.data
      setFullArtifact(art)

      const urlRes = await fetch(
        `/api/storage/sign-download?storagePath=${encodeURIComponent(art.storage_path)}`
      )
      const urlJson = await urlRes.json()
      setSignedUrl(urlJson.signedUrl ?? null)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const viewerArtifact: ViewerArtifactSummary | null = fullArtifact
    ? {
        id: fullArtifact.id,
        fileType: fullArtifact.file_type,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        parsedJson: fullArtifact.parsed_json as any,
        parseStatus: fullArtifact.parse_status,
        storagePath: fullArtifact.storage_path,
        fileName: fullArtifact.file_name,
      }
    : null

  return (
    <div className="p-2 space-y-1">
      <button
        type="button"
        onClick={handleExpand}
        className="w-full flex items-center justify-between gap-2 text-left hover:opacity-80 transition-opacity"
      >
        <div className="min-w-0">
          <p className="text-xs font-medium truncate">{artifact.label}</p>
          <p className="text-xs text-muted-foreground truncate">{artifact.fileName}</p>
        </div>
        <Badge variant="outline" className="text-xs shrink-0">
          {FILE_TYPE_DISPLAY[artifact.fileType] ?? artifact.fileType}
        </Badge>
      </button>

      {expanded && (
        <div className="min-h-[80px]">
          {loading ? (
            <div className="flex items-center justify-center h-16">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : viewerArtifact ? (
            <CompactViewer
              artifact={viewerArtifact}
              signedUrl={signedUrl ?? undefined}
            />
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">
              Unable to load preview
            </p>
          )}
        </div>
      )}
    </div>
  )
}
