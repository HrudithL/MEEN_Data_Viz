'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import { PHASE_DISPLAY } from '@/lib/constants'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { FILE_TYPE_DISPLAY } from '@/lib/constants'
import { NotesPreview } from './NotesPreview'
import type { VizPhase, ArtifactSummary } from '@/types/api'
import type { NotesJson, PhaseIdEnum } from '@/types/database'
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
  compact?: boolean
  compareMode?: boolean
}

interface FullArtifact {
  id: string
  file_type: string
  storage_path: string
  file_name: string
  parsed_json: unknown
  parse_status: string
}

function hasNotesContent(notesJson: NotesJson | null | undefined): boolean {
  if (!notesJson?.blocks?.length) return false
  return notesJson.blocks.some(b => {
    if (b.type === 'image' || b.type === 'file') return true
    if (b.type === 'paragraph' || b.type === 'bullet') return Boolean(b.text?.trim())
    return false
  })
}

export function PhaseCell({ vizPhase, phaseKey, compact = false, compareMode = false }: PhaseCellProps) {
  const showNotes = hasNotesContent(vizPhase.notesJson as NotesJson)

  return (
    <div className="border rounded-lg overflow-hidden flex flex-col h-full">
      <div
        className={cn(
          'px-3 py-2 border-b text-xs font-semibold flex items-center justify-between',
          vizPhase.isComplete ? 'bg-emerald-500/10 text-emerald-400' : 'bg-muted/40 text-muted-foreground'
        )}
      >
        <span>{PHASE_DISPLAY[phaseKey]}</span>
        {vizPhase.isComplete && <span className="text-emerald-400">&#10003;</span>}
      </div>

      {showNotes && (
        <div className="px-2 py-2 border-b bg-muted/20">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
            Notes
          </p>
          <NotesPreview notesJson={vizPhase.notesJson as NotesJson} maxBlocks={2} />
        </div>
      )}

      <div
        className={cn(
          'flex-1 divide-y overflow-y-auto',
          compareMode ? 'max-h-none' : compact ? 'max-h-[240px]' : 'max-h-[420px]'
        )}
      >
        {vizPhase.artifacts.length === 0 ? (
          <div className="flex items-center justify-center h-16 text-xs text-muted-foreground">
            No data
          </div>
        ) : (
          vizPhase.artifacts.map(artifact => (
            <ArtifactCompactCell
              key={artifact.id}
              artifact={artifact}
              compact={compact}
              compareMode={compareMode}
            />
          ))
        )}
      </div>
    </div>
  )
}

function ArtifactCompactCell({
  artifact,
  compact = false,
  compareMode = false,
}: {
  artifact: ArtifactSummary
  compact?: boolean
  compareMode?: boolean
}) {
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

      const needsUrl =
        art.file_type === 'stl' ||
        art.file_type === 'ply' ||
        art.file_type === 'png' ||
        art.file_type === 'mtex'

      if (needsUrl) {
        const urlRes = await fetch(
          `/api/storage/sign-download?storagePath=${encodeURIComponent(art.storage_path)}`
        )
        const urlJson = await urlRes.json()
        setSignedUrl(urlJson.data?.signedUrl ?? null)
      }
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
              density={compareMode ? 'full' : compact ? 'compact' : 'full'}
              compareMode={compareMode}
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
