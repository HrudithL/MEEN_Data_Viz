'use client'

import { useEffect, useRef, useState } from 'react'
import { Upload, Download, Loader2, Save, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { formatBytes } from '@/lib/utils'
import { isNotesImportFile } from '@/lib/notes-import'
import type { NotesJson, RichTextBlock, PhaseIdEnum } from '@/types/database'

type NoteFileBlock = Extract<RichTextBlock, { type: 'file' }>

function defaultNotesName(phaseKey: PhaseIdEnum): string {
  return `${phaseKey.replace(/_/g, '-')}-notes`
}

function isFileBlock(block: RichTextBlock): block is NoteFileBlock {
  return block.type === 'file'
}

interface NoteEditorDialogProps {
  block: NoteFileBlock | null
  phaseId: string
  phaseKey: PhaseIdEnum
  orgId: string
  buildId: string
  notes: NotesJson
  onNotesChange: (notes: NotesJson) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NoteEditorDialog({
  block,
  phaseId,
  phaseKey,
  orgId,
  buildId,
  notes,
  onNotesChange,
  open,
  onOpenChange,
}: NoteEditorDialogProps) {
  const [content, setContent] = useState('')
  const [fileName, setFileName] = useState('')
  const [label, setLabel] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open || !block) return
    setFileName(block.fileName)
    setLabel(block.label ?? block.fileName.replace(/\.[^.]+$/, ''))
    setLoading(true)
    setError('')
    fetch(`/api/storage/sign-download?storagePath=${encodeURIComponent(block.storagePath)}`)
      .then(r => r.json())
      .then(async json => {
        const signedUrl = json.data?.signedUrl
        if (!signedUrl) throw new Error('Could not get download URL')
        const textRes = await fetch(signedUrl)
        setContent(await textRes.text())
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load note'))
      .finally(() => setLoading(false))
  }, [open, block?.storagePath, block?.fileName, block?.label])

  async function persistNotes(nextBlocks: RichTextBlock[]) {
    const payload: NotesJson = { format: 'richtext_v1', blocks: nextBlocks }
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
  }

  async function uploadNoteFile(file: File, replacePath?: string) {
    if (!block) return
    setUploading(true)
    setProgress(0)
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
      if (!signRes.ok) throw new Error('Failed to get upload URL')
      const signJson = await signRes.json()
      const { signedUrl, storagePath } = signJson.data

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = e => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error('Upload failed')))
        xhr.onerror = () => reject(new Error('Upload failed'))
        xhr.open('PUT', signedUrl)
        xhr.setRequestHeader('Content-Type', file.type || 'text/plain')
        xhr.send(file)
      })

      const nextBlock: NoteFileBlock = {
        type: 'file',
        storagePath,
        fileName: file.name,
        fileSize: file.size,
        label: label.trim() || defaultNotesName(phaseKey),
        updatedAt: new Date().toISOString(),
      }

      const replaceKey = replacePath ?? block.storagePath
      const otherBlocks = notes.blocks.filter(
        b => !isFileBlock(b) || b.storagePath !== replaceKey
      )
      await persistNotes([...otherBlocks, nextBlock])
      setFileName(file.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function saveTextContent() {
    if (!block || !content.trim()) return
    setSaving(true)
    setError('')
    try {
      const name = fileName.trim() || block.fileName
      const blob = new Blob([content], { type: 'text/plain' })
      const file = new File([blob], name, { type: blob.type })
      await uploadNoteFile(file, block.storagePath)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDownload() {
    if (!block) return
    const urlRes = await fetch(
      `/api/storage/sign-download?storagePath=${encodeURIComponent(block.storagePath)}`
    )
    const urlJson = await urlRes.json()
    const url = urlJson.data?.signedUrl
    if (url) window.open(url, '_blank')
  }

  async function handleDelete() {
    if (!block) return
    setSaving(true)
    setError('')
    try {
      const next = notes.blocks.filter(
        b => !isFileBlock(b) || b.storagePath !== block.storagePath
      )
      await persistNotes(next.length ? next : [])
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

  if (!block) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Note</DialogTitle>
          <DialogDescription>{formatBytes(block.fileSize)}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Label</label>
            <Input value={label} onChange={e => setLabel(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">File name</label>
            <Input value={fileName} onChange={e => setFileName(e.target.value)} className="h-8 text-sm" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-3.5 w-3.5 mr-1" />
            Download
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload className="h-3.5 w-3.5 mr-1" />
            Re-upload
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={saving || uploading}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Delete
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".md,.txt,text/plain,text/markdown"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) {
                if (!isNotesImportFile(f.name)) {
                  setError('Notes upload accepts .md and .txt files only')
                } else {
                  void uploadNoteFile(f, block.storagePath)
                }
              }
              e.target.value = ''
            }}
          />
        </div>

        {uploading && <Progress value={progress} className="h-1.5" />}
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <>
              <Textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                className="font-mono text-xs min-h-[300px]"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Edit content and save when ready</p>
                <Button onClick={saveTextContent} disabled={saving || uploading || !content.trim()} size="sm">
                  <Save className="h-3.5 w-3.5 mr-1" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
