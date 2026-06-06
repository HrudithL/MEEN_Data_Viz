'use client'

import { useCallback, useRef, useState } from 'react'
import { Upload, Trash2, Loader2 } from 'lucide-react'
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
import { isNotesImportFile } from '@/lib/notes-import'
import { NoteEditorDialog } from './NoteEditorDialog'
import type { NotesJson, RichTextBlock, PhaseIdEnum } from '@/types/database'

function defaultNotesName(phaseKey: PhaseIdEnum): string {
  return `${phaseKey.replace(/_/g, '-')}-notes`
}

interface NotesEditorProps {
  phaseId: string
  phaseKey: PhaseIdEnum
  orgId: string
  buildId: string
  notes: NotesJson
  onNotesChange: (notes: NotesJson) => void
  readOnly?: boolean
}

type NoteFileBlock = Extract<RichTextBlock, { type: 'file' }>

function isFileBlock(block: RichTextBlock): block is NoteFileBlock {
  return block.type === 'file'
}

function getFileBlocks(notes: NotesJson): NoteFileBlock[] {
  return (notes.blocks ?? []).filter(isFileBlock)
}

export function NotesEditor({
  phaseId,
  phaseKey,
  orgId,
  buildId,
  notes,
  onNotesChange,
  readOnly = false,
}: NotesEditorProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [editingBlock, setEditingBlock] = useState<NoteFileBlock | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const fileBlocks = getFileBlocks(notes)

  const persistNotes = useCallback(
    async (nextBlocks: RichTextBlock[]) => {
      setSaving(true)
      setError('')
      const payload: NotesJson = { format: 'richtext_v1', blocks: nextBlocks }
      try {
        const res = await fetch(`/api/phases/${phaseId}/notes`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes_json: payload }),
        })
        if (!res.ok) {
          const json = await res.json()
          throw new Error(json.error?.message ?? 'Failed to save notes')
        }
        const json = await res.json()
        onNotesChange((json.data?.notes_json ?? payload) as NotesJson)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error saving')
      } finally {
        setSaving(false)
      }
    },
    [phaseId, onNotesChange]
  )

  async function uploadNoteFile(file: File) {
    setUploading(true)
    setError('')
    try {
      const signRes = await fetch('/api/storage/sign-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          buildId,
          phaseId,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'text/plain',
          notesFile: true,
        }),
      })
      const signJson = await signRes.json()
      if (!signRes.ok) throw new Error(signJson.error?.message ?? 'Failed to get upload URL')

      const { signedUrl, storagePath } = signJson.data
      await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'text/plain' },
      })

      const block: NoteFileBlock = {
        type: 'file',
        storagePath,
        fileName: file.name,
        fileSize: file.size,
        label: defaultNotesName(phaseKey),
        updatedAt: new Date().toISOString(),
      }

      const otherBlocks = notes.blocks.filter(b => !isFileBlock(b) || b.storagePath !== storagePath)
      await persistNotes([...otherBlocks, block])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleImportFile(file: File) {
    if (!isNotesImportFile(file.name)) {
      setError('Notes upload accepts .md and .txt files only')
      return
    }
    await uploadNoteFile(file)
  }

  async function handleDelete(block: NoteFileBlock) {
    const next = notes.blocks.filter(
      b => !isFileBlock(b) || b.storagePath !== block.storagePath
    )
    await persistNotes(next.length ? next : [])
  }

  if (readOnly) {
    if (fileBlocks.length === 0) {
      return <p className="text-sm text-muted-foreground italic">No notes</p>
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Label</TableHead>
            <TableHead className="text-xs">File</TableHead>
            <TableHead className="text-xs">Size</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fileBlocks.map(block => (
            <TableRow key={block.storagePath}>
              <TableCell className="text-sm">{block.label ?? block.fileName}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{block.fileName}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {formatBytes(block.fileSize)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  return (
    <div className="space-y-4">
      <div
        onClick={() => fileRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          uploading
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30'
        )}
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
        ) : (
          <>
            <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
            <p className="text-sm font-medium mt-2">Drop .md or .txt file — uploads automatically</p>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".md,.txt,text/plain,text/markdown"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) void handleImportFile(file)
            e.target.value = ''
          }}
        />
      </div>

      <div className="min-h-[1.25rem] text-xs">
        {error ? (
          <span className="text-destructive">{error}</span>
        ) : saving ? (
          <span className="text-muted-foreground">Saving...</span>
        ) : null}
      </div>

      <div>
        <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Note Files
        </h5>
        {fileBlocks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No note files yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Label</TableHead>
                <TableHead className="text-xs">File</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Size</TableHead>
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fileBlocks.map(block => (
                <TableRow
                  key={block.storagePath}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => {
                    setEditingBlock(block)
                    setEditorOpen(true)
                  }}
                >
                  <TableCell className="text-sm font-medium">
                    {block.label ?? block.fileName}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                    {block.fileName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">MD</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatBytes(block.fileSize)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={e => {
                        e.stopPropagation()
                        void handleDelete(block)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <NoteEditorDialog
        block={
          editingBlock
            ? getFileBlocks(notes).find(
                b => b.storagePath === editingBlock.storagePath || b.label === editingBlock.label
              ) ?? editingBlock
            : null
        }
        phaseId={phaseId}
        phaseKey={phaseKey}
        orgId={orgId}
        buildId={buildId}
        notes={notes}
        onNotesChange={onNotesChange}
        open={editorOpen}
        onOpenChange={open => {
          setEditorOpen(open)
          if (!open) setEditingBlock(null)
        }}
      />
    </div>
  )
}
