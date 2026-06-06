'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { notifyBuildDataChanged } from '@/lib/build-data-events'
import { ChevronDown, ChevronRight, CheckCircle2, Circle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn, formatBytes } from '@/lib/utils'
import { FILE_TYPE_DISPLAY, PHASE_DISPLAY } from '@/lib/constants'
import { ArtifactUploader } from './ArtifactUploader'
import { NotesEditor } from './NotesEditor'
import { ArtifactEditorDialog } from './ArtifactEditorDialog'
import type { ArtifactSummary } from '@/types/api'
import type { PhaseWithArtifacts } from '@/types/api'
import type { NotesJson, PhaseIdEnum } from '@/types/database'

interface PhasePanelProps {
  phase: PhaseWithArtifacts
  phaseKey: PhaseIdEnum
  orgId: string
  buildId: string
  canEdit: boolean
  defaultOpen?: boolean
}

const PARSE_STATUS_VARIANT: Record<string, string> = {
  ok: 'bg-green-50 text-green-700 border-green-200',
  partial: 'bg-amber-50 text-amber-700 border-amber-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
}

function normalizeNotes(raw: unknown): NotesJson {
  if (
    raw &&
    typeof raw === 'object' &&
    'format' in raw &&
    (raw as NotesJson).format === 'richtext_v1' &&
    Array.isArray((raw as NotesJson).blocks)
  ) {
    return raw as NotesJson
  }
  return { format: 'richtext_v1', blocks: [{ type: 'paragraph', text: '' }] }
}

export function PhasePanel({
  phase,
  phaseKey,
  orgId,
  buildId,
  canEdit,
  defaultOpen = false,
}: PhasePanelProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [artifacts, setArtifacts] = useState(phase.artifacts ?? [])
  const [isComplete, setIsComplete] = useState(phase.is_complete)
  const [notesJson, setNotesJson] = useState<NotesJson>(() => normalizeNotes(phase.notes_json))
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingArtifact, setEditingArtifact] = useState<ArtifactSummary | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const router = useRouter()

  async function reloadArtifacts() {
    try {
      const res = await fetch(`/api/builds/${buildId}/phases`, { cache: 'no-store' })
      if (!res.ok) return
      const json = await res.json()
      const updatedPhase = json.data?.find((p: { id: string }) => p.id === phase.id)
      if (updatedPhase) {
        if (updatedPhase.artifacts) setArtifacts(updatedPhase.artifacts)
        if (updatedPhase.notes_json) setNotesJson(normalizeNotes(updatedPhase.notes_json))
        if (typeof updatedPhase.is_complete === 'boolean') setIsComplete(updatedPhase.is_complete)
      }
      notifyBuildDataChanged(buildId)
      router.refresh()
    } catch {
      // ignore
    }
  }

  async function handleDelete(artifactId: string) {
    setDeletingId(artifactId)
    try {
      await fetch(`/api/artifacts/${artifactId}`, { method: 'DELETE' })
      setArtifacts(prev => prev.filter(a => a.id !== artifactId))
      notifyBuildDataChanged(buildId)
      router.refresh()
    } catch {
      // ignore
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/40 transition-colors"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        {isComplete ? (
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <span className="font-medium text-sm text-left flex-1">
          {PHASE_DISPLAY[phaseKey]}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">{artifacts.length} artifact{artifacts.length !== 1 ? 's' : ''}</span>
          <Badge
            variant="outline"
            className={cn(
              'text-xs',
              isComplete
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-amber-200 bg-amber-50 text-amber-700'
            )}
          >
            {isComplete ? 'Complete' : 'Incomplete'}
          </Badge>
        </div>
      </button>

      {open && (
        <div className="border-t divide-y">
          {canEdit && (
            <div className="p-4 bg-muted/10">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Upload Artifacts
              </h4>
              <ArtifactUploader
                phaseId={phase.id}
                phaseKey={phaseKey}
                orgId={orgId}
                buildId={buildId}
                onUploaded={reloadArtifacts}
              />
            </div>
          )}

          <div className="p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Artifacts
            </h4>
            {artifacts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No artifacts uploaded yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Label</TableHead>
                    <TableHead className="text-xs">File</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Size</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    {canEdit && <TableHead className="w-8"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {artifacts.map(artifact => (
                    <TableRow
                      key={artifact.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => {
                        setEditingArtifact(artifact)
                        setEditorOpen(true)
                      }}
                    >
                      <TableCell className="text-sm font-medium">{artifact.label}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                        {artifact.fileName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {FILE_TYPE_DISPLAY[artifact.fileType] ?? artifact.fileType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatBytes(artifact.fileSize)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'inline-flex px-2 py-0.5 rounded border text-xs font-medium',
                            PARSE_STATUS_VARIANT[artifact.parseStatus] ?? 'border-border text-muted-foreground'
                          )}
                        >
                          {artifact.parseStatus}
                        </span>
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={e => {
                              e.stopPropagation()
                              handleDelete(artifact.id)
                            }}
                            disabled={deletingId === artifact.id}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Notes
            </h4>
            <NotesEditor
              phaseId={phase.id}
              phaseKey={phaseKey}
              orgId={orgId}
              buildId={buildId}
              notes={notesJson}
              onNotesChange={setNotesJson}
              readOnly={!canEdit}
            />
          </div>
        </div>
      )}

      <ArtifactEditorDialog
        artifact={editingArtifact}
        phaseId={phase.id}
        orgId={orgId}
        buildId={buildId}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onUpdated={reloadArtifacts}
      />
    </div>
  )
}
