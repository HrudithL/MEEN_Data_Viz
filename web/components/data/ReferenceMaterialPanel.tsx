'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Upload,
  X,
  AlertCircle,
  FileText,
  Download,
  Trash2,
  FolderOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn, formatBytes, isReferenceExtensionAllowed } from '@/lib/utils'
import {
  REFERENCE_ACCEPTED_EXTENSIONS,
  REFERENCE_EXTENSION_DISPLAY,
  MAX_UPLOAD_BYTES,
} from '@/lib/constants'
import type { BuildReference } from '@/types/api'

interface ReferenceMaterialPanelProps {
  buildId: string
  orgId: string
  canEdit: boolean
}

const ACCEPT_LIST = REFERENCE_ACCEPTED_EXTENSIONS.join(',')

export function ReferenceMaterialPanel({ buildId, orgId, canEdit }: ReferenceMaterialPanelProps) {
  const [open, setOpen] = useState(false)
  const [references, setReferences] = useState<BuildReference[]>([])
  const [loading, setLoading] = useState(true)
  interface PendingRef {
    id: string
    file: File
    label: string
  }

  const [pendingFiles, setPendingFiles] = useState<PendingRef[]>([])
  const [description, setDescription] = useState('')
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadReferences = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/builds/${buildId}/references`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load references')
      const json = await res.json()
      setReferences(json.data ?? [])
    } catch {
      setReferences([])
    } finally {
      setLoading(false)
    }
  }, [buildId])

  useEffect(() => {
    loadReferences()
  }, [loadReferences])

  function validateFile(f: File): string | null {
    if (!isReferenceExtensionAllowed(f.name)) {
      return 'Unsupported file type for project reference uploads'
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      return `File too large. Maximum ${formatBytes(MAX_UPLOAD_BYTES)}.`
    }
    return null
  }

  function addFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList)
    if (!incoming.length) return

    const errors: string[] = []
    const additions: PendingRef[] = []

    for (const f of incoming) {
      const err = validateFile(f)
      if (err) {
        errors.push(`${f.name}: ${err}`)
        continue
      }
      additions.push({
        id: `${f.name}-${f.size}-${f.lastModified}`,
        file: f,
        label: f.name.replace(/\.[^.]+$/, '') || f.name,
      })
    }

    if (errors.length > 0) setError(errors.join(' '))
    else setError('')

    if (!additions.length) return

    setPendingFiles(prev => {
      const existing = new Set(prev.map(p => p.id))
      return [...prev, ...additions.filter(a => !existing.has(a.id))]
    })
  }

  function removePending(id: string) {
    setPendingFiles(prev => prev.filter(p => p.id !== id))
    setError('')
  }

  function updateLabel(id: string, label: string) {
    setPendingFiles(prev => prev.map(p => (p.id === id ? { ...p, label } : p)))
  }

  async function uploadSingle(
    pending: PendingRef,
    start: number,
    end: number
  ) {
    const { file, label } = pending
    const signRes = await fetch('/api/storage/sign-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orgId,
        buildId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        reference: true,
      }),
    })
    const signJson = await signRes.json()
    if (!signRes.ok) throw new Error(signJson.error?.message ?? 'Failed to get upload URL')

    const { signedUrl, storagePath } = signJson.data
    setProgress(start + Math.round((end - start) * 0.2))

    const xhr = new XMLHttpRequest()
    await new Promise<void>((resolve, reject) => {
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) {
          const ratio = e.loaded / e.total
          setProgress(start + Math.round((end - start) * (0.2 + ratio * 0.6)))
        }
      }
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('Upload failed')))
      xhr.onerror = () => reject(new Error('Network error'))
      xhr.open('PUT', signedUrl)
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
      xhr.send(file)
    })

    const regRes = await fetch(`/api/builds/${buildId}/references`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: label.trim() || file.name.replace(/\.[^.]+$/, ''),
        description: description.trim() || undefined,
        storagePath,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || null,
      }),
    })
    const regJson = await regRes.json()
    if (!regRes.ok) throw new Error(regJson.error?.message ?? `Failed to register ${file.name}`)

    setProgress(end)
  }

  async function handleUpload() {
    if (!pendingFiles.length) return
    setUploading(true)
    setError('')
    setProgress(0)

    try {
      const total = pendingFiles.length
      for (let i = 0; i < total; i++) {
        const start = Math.round((i / total) * 100)
        const end = Math.round(((i + 1) / total) * 100)
        await uploadSingle(pendingFiles[i], start, end)
      }

      setPendingFiles([])
      setDescription('')
      setProgress(0)
      await loadReferences()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleDownload(ref: BuildReference) {
    const res = await fetch(`/api/storage/sign-download?storagePath=${encodeURIComponent(ref.storage_path)}`)
    const json = await res.json()
    if (!res.ok || !json.data?.signedUrl) return
    window.open(json.data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  async function handleDelete(refId: string) {
    setDeletingId(refId)
    try {
      await fetch(`/api/builds/${buildId}/references/${refId}`, { method: 'DELETE' })
      setReferences(prev => prev.filter(r => r.id !== refId))
    } finally {
      setDeletingId(null)
    }
  }

  const acceptedDisplay = REFERENCE_ACCEPTED_EXTENSIONS.map(
    ext => REFERENCE_EXTENSION_DISPLAY[ext] ?? ext
  )
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(', ')

  return (
    <div className="border rounded-lg overflow-hidden border-primary/30 bg-primary/[0.02]">
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
        <FolderOpen className="h-4 w-4 text-primary shrink-0" />
        <span className="font-medium text-sm text-left flex-1">Project Reference Material</span>
        <Badge variant="outline" className="text-xs">
          {references.length} file{references.length !== 1 ? 's' : ''}
        </Badge>
      </button>

      {open && (
        <div className="border-t p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload supporting project files here — process parameters, heat treatment schedules,
            presentations, notes, geometry, or any reference data. Not tied to a single phase.
            Put your <strong>00_reference</strong> folder contents here.
          </p>

          {canEdit && (
            <div className="rounded-lg border bg-muted/10 p-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ref-desc" className="text-xs font-medium">
                  Description <span className="text-muted-foreground font-normal">(optional, applies to batch)</span>
                </Label>
                <Textarea
                  id="ref-desc"
                  placeholder="Short note about these reference files..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>

              <div
                onDragOver={e => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => {
                  e.preventDefault()
                  setDragging(false)
                  addFiles(e.dataTransfer.files)
                }}
                onClick={() => fileRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
                  dragging
                    ? 'border-primary bg-primary/5'
                    : pendingFiles.length > 0
                      ? 'border-green-400 bg-green-50'
                      : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30'
                )}
              >
                <div className="space-y-2">
                  <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {pendingFiles.length > 0
                        ? 'Add more reference files or click to browse'
                        : 'Drop reference files or click to browse'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xl mx-auto">
                      Accepts: {acceptedDisplay}
                    </p>
                  </div>
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept={ACCEPT_LIST}
                className="hidden"
                onChange={e => {
                  if (e.target.files) addFiles(e.target.files)
                  e.target.value = ''
                }}
              />

              {pendingFiles.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {pendingFiles.map(pending => (
                    <div
                      key={pending.id}
                      className="flex items-center gap-2 rounded-md border bg-background p-2"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <Input
                          value={pending.label}
                          onChange={e => updateLabel(pending.id, e.target.value)}
                          className="h-7 text-xs"
                          placeholder="Label"
                          onClick={e => e.stopPropagation()}
                        />
                        <p className="text-xs text-muted-foreground truncate">
                          {pending.file.name} · {formatBytes(pending.file.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          removePending(pending.id)
                        }}
                        className="p-1 hover:bg-destructive/10 rounded-sm transition-colors shrink-0"
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-destructive text-xs">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </div>
              )}

              {uploading && progress > 0 && <Progress value={progress} className="h-1.5" />}

              <Button
                type="button"
                onClick={handleUpload}
                disabled={pendingFiles.length === 0 || uploading}
                size="sm"
                className="w-full sm:w-auto"
              >
                {uploading
                  ? `Uploading... ${progress}%`
                  : pendingFiles.length > 1
                    ? `Upload ${pendingFiles.length} reference files`
                    : 'Upload reference file'}
              </Button>
            </div>
          )}

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Reference library
            </h4>
            {loading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
            ) : references.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No reference files yet. Upload process parameters, presentations, or other project docs above.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Label</TableHead>
                    <TableHead className="text-xs">File</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Size</TableHead>
                    <TableHead className="w-20 text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {references.map(ref => (
                    <TableRow key={ref.id}>
                      <TableCell className="text-sm font-medium">
                        <div>{ref.label}</div>
                        {ref.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {ref.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                        <span className="inline-flex items-center gap-1">
                          <FileText className="h-3 w-3 shrink-0" />
                          {ref.file_name}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {REFERENCE_EXTENSION_DISPLAY[ref.file_extension] ?? ref.file_extension}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatBytes(ref.file_size)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleDownload(ref)}
                            title="Download"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(ref.id)}
                              disabled={deletingId === ref.id}
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
