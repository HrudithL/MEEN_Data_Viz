'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, CheckCircle2, Circle, Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'
import { PHASE_DISPLAY } from '@/lib/constants'
import { ArtifactToolbar } from './ArtifactToolbar'
import { NotesPreview } from './NotesPreview'
import { Badge } from '@/components/ui/badge'
import type { VizPhase, ArtifactSummary } from '@/types/api'
import type { PhaseIdEnum, NotesJson } from '@/types/database'
import type { ArtifactSummary as ViewerArtifactSummary } from '@/components/viewers/ViewerRegistry'

const ViewerRegistry = dynamic(
  () => import('@/components/viewers/ViewerRegistry').then(m => m.ViewerRegistry),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    ),
  }
)

interface VizPhasePanelProps {
  vizPhase: VizPhase
  phaseKey: PhaseIdEnum
  defaultOpen?: boolean
}

interface FullArtifact {
  id: string
  file_type: string
  storage_path: string
  file_name: string
  parsed_json: unknown
  parse_status: string
}

export function VizPhasePanel({ vizPhase, phaseKey, defaultOpen = false }: VizPhasePanelProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<'label' | 'date' | 'type'>('label')
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(
    vizPhase.artifacts[0]?.id ?? null
  )
  const [fullArtifact, setFullArtifact] = useState<FullArtifact | null>(null)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [loadingArtifact, setLoadingArtifact] = useState(false)

  useEffect(() => {
    if (!activeArtifactId) return
    setFullArtifact(null)
    setSignedUrl(null)
    setLoadingArtifact(true)

    fetch(`/api/artifacts/${activeArtifactId}`)
      .then(r => r.json())
      .then(async (json) => {
        const art: FullArtifact = json.data
        setFullArtifact(art)
        // Get signed URL
        const urlRes = await fetch(
          `/api/storage/sign-download?storagePath=${encodeURIComponent(art.storage_path)}`
        )
        const urlJson = await urlRes.json()
        setSignedUrl(urlJson.data?.signedUrl ?? null)
      })
      .catch(() => {})
      .finally(() => setLoadingArtifact(false))
  }, [activeArtifactId])

  const hasNotesContent = (() => {
    if (!vizPhase.notesJson || typeof vizPhase.notesJson !== 'object') return false
    const n = vizPhase.notesJson as Record<string, unknown>
    if (!('blocks' in n) || !Array.isArray(n.blocks)) return false
    return (n.blocks as { type: string; text?: string }[]).some(
      b => b.type === 'image' || Boolean(b.text?.trim())
    )
  })()

  // Build the ViewerRegistry artifact shape
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
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/30 transition-colors"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        {vizPhase.isComplete ? (
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <span className="font-medium text-sm text-left flex-1">
          {PHASE_DISPLAY[phaseKey]}
        </span>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              'text-xs',
              vizPhase.isComplete
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-muted text-muted-foreground'
            )}
          >
            {vizPhase.artifacts.length} artifact{vizPhase.artifacts.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </button>

      {open && (
        <div className="border-t divide-y">
          {/* Notes preview */}
          {hasNotesContent && (
            <div className="px-4 py-3 bg-muted/20">
              <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
              <NotesPreview notesJson={vizPhase.notesJson as NotesJson} maxBlocks={3} />
            </div>
          )}

          {/* Artifact viewer */}
          <div className="p-4 space-y-4">
            {vizPhase.artifacts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No artifacts in this phase
              </p>
            ) : (
              <>
                <ArtifactToolbar
                  artifacts={vizPhase.artifacts}
                  activeId={activeArtifactId}
                  search={search}
                  sortKey={sortKey}
                  onSearchChange={setSearch}
                  onSortChange={setSortKey}
                  onTabChange={id => {
                    setActiveArtifactId(id)
                    setFullArtifact(null)
                    setSignedUrl(null)
                  }}
                />
                <div className="min-h-[200px]">
                  {loadingArtifact ? (
                    <div className="flex items-center justify-center h-48">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : viewerArtifact ? (
                    <ViewerRegistry
                      artifact={viewerArtifact}
                      density="full"
                      signedUrl={signedUrl ?? undefined}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      Select an artifact to view
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
