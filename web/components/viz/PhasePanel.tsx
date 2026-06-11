'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'
import { AnimatedCollapsible, CollapsibleHeader, FuturisticLoader } from '@/components/motion'
import { PHASE_DISPLAY } from '@/lib/constants'
import { ArtifactToolbar } from './ArtifactToolbar'
import { NotesPreview } from './NotesPreview'
import { Badge } from '@/components/ui/badge'
import type { VizPhase } from '@/types/api'
import type { PhaseIdEnum, NotesJson } from '@/types/database'
import type { ArtifactSummary as ViewerArtifactSummary } from '@/components/viewers/ViewerRegistry'

const ViewerRegistry = dynamic(
  () => import('@/components/viewers/ViewerRegistry').then(m => m.ViewerRegistry),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 flex items-center justify-center">
        <FuturisticLoader size="md" />
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
    <div className={cn(
      'border rounded-xl overflow-hidden transition-all duration-300 ease-snappy',
      open ? 'border-border/80 shadow-sm shadow-primary/5' : 'border-border/50 hover:border-border/70'
    )}>
      <CollapsibleHeader open={open} onClick={() => setOpen(!open)}>
        {vizPhase.isComplete ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
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
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-muted/50 text-muted-foreground border-border/60'
            )}
          >
            {vizPhase.artifacts.length} artifact{vizPhase.artifacts.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CollapsibleHeader>

      <AnimatedCollapsible open={open}>
        <div className="border-t border-border/50 divide-y divide-border/50">
          {/* Notes preview */}
          {hasNotesContent && (
            <div className="px-4 py-3 bg-muted/10">
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Notes</p>
              <NotesPreview notesJson={vizPhase.notesJson as NotesJson} maxBlocks={3} />
            </div>
          )}

          {/* Artifact viewer */}
          <div className="p-4 space-y-4">
            {vizPhase.artifacts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
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
                      <FuturisticLoader size="md" label="Loading artifact…" />
                    </div>
                  ) : viewerArtifact ? (
                    <ViewerRegistry
                      artifact={viewerArtifact}
                      density="full"
                      signedUrl={signedUrl ?? undefined}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Select an artifact to view
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </AnimatedCollapsible>
    </div>
  )
}
