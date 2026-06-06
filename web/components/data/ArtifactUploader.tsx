'use client'

import { useCallback, useRef, useState } from 'react'
import { Upload, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { cn, formatBytes, isRejectedExtension, detectFileType } from '@/lib/utils'
import {
  PHASE_ACCEPTED_TYPES,
  FILE_EXTENSIONS,
  FILE_TYPE_DISPLAY,
  MAX_UPLOAD_BYTES,
  PHASE_DEMO_FILES,
} from '@/lib/constants'
import { getDemoFileApiPath } from '@/lib/demo-files'
import type { PhaseIdEnum } from '@/types/database'

interface ArtifactUploaderProps {
  phaseId: string
  phaseKey: PhaseIdEnum
  orgId: string
  buildId: string
  onUploaded: () => void
}

interface PendingUpload {
  id: string
  file: File
  label: string
}

export function ArtifactUploader({
  phaseId,
  phaseKey,
  orgId,
  buildId,
  onUploaded,
}: ArtifactUploaderProps) {
  const acceptedTypes = PHASE_ACCEPTED_TYPES[phaseKey] ?? []
  const demoFile = PHASE_DEMO_FILES[phaseKey]

  const [pendingFiles, setPendingFiles] = useState<PendingUpload[]>([])
  const [metadata, setMetadata] = useState({ shield_gas: '', heat_treatment: '', process_parameters: '' })
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const uploadingRef = useRef(false)

  const acceptExtensions = acceptedTypes
    .flatMap(t => FILE_EXTENSIONS[t] ?? [])
    .join(',')

  const acceptedTypesDisplay = acceptedTypes.map(t => FILE_TYPE_DISPLAY[t] ?? t)

  function validateFile(f: File): string | null {
    if (isRejectedExtension(f.name)) {
      return 'Excel files (.xlsx, .xls) are not accepted. Please export as CSV.'
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      return `File too large. Maximum ${formatBytes(MAX_UPLOAD_BYTES)}.`
    }
    const detected = detectFileType(f.name)
    if (!detected) return 'Unsupported file type'
    if (!acceptedTypes.includes(detected)) {
      return `This phase accepts: ${acceptedTypesDisplay.join(', ')}`
    }
    return null
  }

  const uploadSingleFile = useCallback(
    async (pending: PendingUpload, fileProgressStart: number, fileProgressEnd: number) => {
      const { file, label } = pending
      if (!label.trim()) throw new Error(`Label required for ${file.name}`)

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
      const signJson = await signRes.json()
      if (!signRes.ok) {
        throw new Error(signJson.error?.message ?? 'Failed to get upload URL')
      }
      const { signedUrl, storagePath } = signJson.data
      setProgress(fileProgressStart + Math.round((fileProgressEnd - fileProgressStart) * 0.15))

      const xhr = new XMLHttpRequest()
      await new Promise<void>((resolve, reject) => {
        xhr.upload.onprogress = e => {
          if (e.lengthComputable) {
            const ratio = e.loaded / e.total
            setProgress(
              fileProgressStart +
                Math.round((fileProgressEnd - fileProgressStart) * (0.15 + ratio * 0.7))
            )
          }
        }
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('Upload failed'))
        xhr.onerror = () => reject(new Error('Network error'))
        xhr.open('PUT', signedUrl)
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
        xhr.send(file)
      })

      const fileType = detectFileType(file.name)
      if (!fileType) throw new Error(`Unsupported file type: ${file.name}`)

      const ebsdFormat =
        fileType === 'ebsd_ang' ? 'ang' : fileType === 'ebsd_ctf' ? 'ctf' : undefined

      const regRes = await fetch(`/api/phases/${phaseId}/artifacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: label.trim(),
          fileType,
          storagePath,
          fileName: file.name,
          fileSize: file.size,
          ...(ebsdFormat && { ebsdFormat }),
          metadata: Object.fromEntries(
            Object.entries(metadata).filter(([, v]) => v.trim())
          ),
        }),
      })
      if (!regRes.ok) {
        const json = await regRes.json()
        throw new Error(json.error?.message ?? `Failed to register ${file.name}`)
      }

      setProgress(fileProgressEnd)
    },
    [orgId, buildId, phaseId, metadata]
  )

  const runUploads = useCallback(
    async (files: PendingUpload[]) => {
      if (files.length === 0 || uploadingRef.current) return
      uploadingRef.current = true
      setUploading(true)
      setError('')
      setProgress(0)

      try {
        const total = files.length
        setPendingFiles(files)
        for (let i = 0; i < total; i++) {
          const start = Math.round((i / total) * 100)
          const end = Math.round(((i + 1) / total) * 100)
          await uploadSingleFile(files[i], start, end)
        }
        setPendingFiles([])
        setMetadata({ shield_gas: '', heat_treatment: '', process_parameters: '' })
        setProgress(0)
        onUploaded()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed')
      } finally {
        uploadingRef.current = false
        setUploading(false)
      }
    },
    [uploadSingleFile, onUploaded]
  )

  function addFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList)
    if (incoming.length === 0) return

    const errors: string[] = []
    const additions: PendingUpload[] = []

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

    if (additions.length === 0) return

    void runUploads(additions)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }, [])

  async function loadDemoFile() {
    if (!demoFile) return
    const demoUrl = getDemoFileApiPath(phaseKey)
    if (!demoUrl) return
    setError('')
    try {
      const res = await fetch(demoUrl)
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.error?.message ?? 'Demo file not found in Data Set/Upload Info Test')
      }
      const blob = await res.blob()
      const file = new File([blob], demoFile.fileName, { type: blob.type || 'application/octet-stream' })
      const err = validateFile(file)
      if (err) throw new Error(err)
      await runUploads([{ id: demoUrl, file, label: demoFile.label }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load demo file')
    }
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !uploading && fileRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          dragging
            ? 'border-primary bg-primary/5'
            : uploading
            ? 'border-primary/50 bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30'
        )}
      >
        <div className="space-y-2">
          <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">
              {uploading ? 'Uploading...' : 'Drop files here — uploads automatically'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Accepts: {acceptedTypesDisplay.join(', ')}
            </p>
          </div>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        multiple
        accept={acceptExtensions}
        className="hidden"
        onChange={e => {
          if (e.target.files) addFiles(e.target.files)
          e.target.value = ''
        }}
      />

      {demoFile && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full text-xs"
          disabled={uploading}
          onClick={e => { e.stopPropagation(); void loadDemoFile() }}
        >
          Use demo file ({demoFile.fileName})
        </Button>
      )}

      {pendingFiles.length > 0 && uploading && (
        <div className="space-y-2">
          {pendingFiles.map(pending => {
            const detected = detectFileType(pending.file.name)
            return (
              <div
                key={pending.id}
                className="flex items-center gap-2 rounded-md border bg-background p-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{pending.label}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(pending.file.size)}</p>
                </div>
                {detected && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    {FILE_TYPE_DISPLAY[detected] ?? detected}
                  </Badge>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {[
          { key: 'shield_gas' as const, placeholder: 'Shield gas (e.g. Ar)' },
          { key: 'heat_treatment' as const, placeholder: 'Heat treatment' },
          { key: 'process_parameters' as const, placeholder: 'Process params' },
        ].map(({ key, placeholder }) => (
          <Input
            key={key}
            placeholder={placeholder}
            value={metadata[key]}
            onChange={e => setMetadata(prev => ({ ...prev, [key]: e.target.value }))}
            className="h-7 text-xs"
          />
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-xs">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      {uploading && progress > 0 && (
        <Progress value={progress} className="h-1.5" />
      )}
    </div>
  )
}
