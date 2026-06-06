'use client'

import { useEffect, useRef, useState } from 'react'
import { Upload, Download, Loader2, Save } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { formatBytes } from '@/lib/utils'
import { TextFileEditor } from './TextFileEditor'
import type { ArtifactSummary } from '@/types/api'

const EDITABLE_EXTENSIONS = new Set(['csv', 'txt', 'md'])

interface ArtifactEditorDialogProps {
  artifact: ArtifactSummary | null
  phaseId: string
  orgId: string
  buildId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: () => void
}

function fileExtension(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

export function ArtifactEditorDialog({
  artifact,
  phaseId,
  orgId,
  buildId,
  open,
  onOpenChange,
  onUpdated,
}: ArtifactEditorDialogProps) {
  const [content, setContent] = useState('')
  const [fileName, setFileName] = useState('')
  const [label, setLabel] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const ext = artifact ? fileExtension(artifact.fileName) : ''
  const isEditable = EDITABLE_EXTENSIONS.has(ext)
  const autosaveEnabled = isEditable && ext !== 'csv'

  useEffect(() => {
    if (!open || !artifact) return
    setFileName(artifact.fileName)
    setLabel(artifact.label)
    if (!isEditable) return
    setLoading(true)
    setError('')
    fetch(`/api/artifacts/${artifact.id}`)
      .then(r => r.json())
      .then(async json => {
        const art = json.data
        const urlRes = await fetch(
          `/api/storage/sign-download?storagePath=${encodeURIComponent(art.storage_path)}`
        )
        const urlJson = await urlRes.json()
        const signedUrl = urlJson.data?.signedUrl
        if (!signedUrl) throw new Error('Could not get download URL')
        const textRes = await fetch(signedUrl)
        setContent(await textRes.text())
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load file'))
      .finally(() => setLoading(false))
  }, [open, artifact?.id, artifact?.fileName, artifact?.label, isEditable])

  async function uploadReplacement(file: File, nextLabel?: string) {
    if (!artifact) return
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
          mimeType: file.type || 'application/octet-stream',
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
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
        xhr.send(file)
      })

      const versionRes = await fetch(`/api/artifacts/${artifact.id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: nextLabel ?? (label.trim() || artifact.label),
          fileType: artifact.fileType,
          storagePath,
          fileName: file.name,
          fileSize: file.size,
          metadata: artifact.metadata,
        }),
      })
      if (!versionRes.ok) throw new Error('Failed to register new version')

      if (file.name !== artifact.fileName || (nextLabel && nextLabel !== artifact.label)) {
        await fetch(`/api/artifacts/${artifact.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            label: nextLabel ?? label,
          }),
        })
      }

      onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function saveTextContent() {
    if (!artifact) return
    setSaving(true)
    try {
      const blob = new Blob([content], { type: 'text/plain' })
      const file = new File([blob], fileName || artifact.fileName, { type: blob.type })
      await uploadReplacement(file, label.trim())
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (!open || !autosaveEnabled || loading || uploading) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      if (content && artifact) void saveTextContent()
    }, 1500)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [content, fileName, label, open, autosaveEnabled, loading, uploading])

  async function handleDownload() {
    if (!artifact) return
    const artRes = await fetch(`/api/artifacts/${artifact.id}`)
    const artJson = await artRes.json()
    const art = artJson.data
    const urlRes = await fetch(
      `/api/storage/sign-download?storagePath=${encodeURIComponent(art.storage_path)}`
    )
    const urlJson = await urlRes.json()
    const url = urlJson.data?.signedUrl
    if (url) window.open(url, '_blank')
  }

  if (!artifact) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Artifact</DialogTitle>
          <DialogDescription>{formatBytes(artifact.fileSize)}</DialogDescription>
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

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-3.5 w-3.5 mr-1" />
            Download
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload className="h-3.5 w-3.5 mr-1" />
            Re-upload
          </Button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) uploadReplacement(f)
              e.target.value = ''
            }}
          />
        </div>

        {uploading && <Progress value={progress} className="h-1.5" />}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {isEditable ? (
          <div className="space-y-2">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <>
                <TextFileEditor
                  content={content}
                  onChange={setContent}
                  fileName={fileName || artifact.fileName}
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {saving || uploading
                      ? 'Saving...'
                      : ext === 'csv'
                        ? 'Edit raw CSV and save when ready'
                        : 'Changes save automatically'}
                  </p>
                  <Button onClick={saveTextContent} disabled={saving || uploading} size="sm">
                    <Save className="h-3.5 w-3.5 mr-1" />
                    {ext === 'csv' ? 'Save' : 'Save now'}
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            This file type cannot be edited inline. Use Re-upload to replace it with a new file.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
