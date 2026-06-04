'use client'

import { useCallback, useRef, useState } from 'react'
import { Upload, X, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { cn, formatBytes, isRejectedExtension, detectFileType } from '@/lib/utils'
import {
  PHASE_ACCEPTED_TYPES,
  FILE_EXTENSIONS,
  FILE_TYPE_DISPLAY,
  MAX_UPLOAD_BYTES,
} from '@/lib/constants'
import type { PhaseIdEnum } from '@/types/database'

interface ArtifactUploaderProps {
  phaseId: string
  phaseKey: PhaseIdEnum
  orgId: string
  buildId: string
  onUploaded: () => void
}

const EBSD_PHASES: PhaseIdEnum[] = ['microstructure']

export function ArtifactUploader({
  phaseId,
  phaseKey,
  orgId,
  buildId,
  onUploaded,
}: ArtifactUploaderProps) {
  const isEbsd = EBSD_PHASES.includes(phaseKey)
  const acceptedTypes = PHASE_ACCEPTED_TYPES[phaseKey] ?? []

  const [file, setFile] = useState<File | null>(null)
  const [label, setLabel] = useState('')
  const [ebsdFormat, setEbsdFormat] = useState<'ang' | 'ctf'>('ang')
  const [metadata, setMetadata] = useState({ shield_gas: '', heat_treatment: '', process_parameters: '' })
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const acceptExtensions = isEbsd
    ? (FILE_EXTENSIONS[`ebsd_${ebsdFormat}`] ?? []).join(',')
    : acceptedTypes
        .flatMap(t => FILE_EXTENSIONS[t] ?? [])
        .join(',')

  function validateFile(f: File): string | null {
    if (isRejectedExtension(f.name)) {
      return 'Excel files (.xlsx, .xls) are not accepted. Please export as CSV.'
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      return `File too large. Maximum ${formatBytes(MAX_UPLOAD_BYTES)}.`
    }
    const detected = detectFileType(f.name)
    if (!detected) return 'Unsupported file type'
    if (isEbsd) {
      const expectedType = `ebsd_${ebsdFormat}`
      if (detected !== expectedType) {
        return `Expected ${FILE_TYPE_DISPLAY[expectedType]} file`
      }
    } else if (!acceptedTypes.includes(detected)) {
      return `This phase accepts: ${acceptedTypes.map(t => FILE_TYPE_DISPLAY[t] ?? t).join(', ')}`
    }
    return null
  }

  function handleFileSelect(f: File) {
    const err = validateFile(f)
    if (err) { setError(err); return }
    setError('')
    setFile(f)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFileSelect(f)
  }, [ebsdFormat, acceptedTypes])

  async function handleUpload() {
    if (!file || !label.trim()) return
    setUploading(true)
    setError('')
    setProgress(0)

    try {
      // 1. Get signed URL
      setProgress(10)
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
      if (!signRes.ok) {
        const json = await signRes.json()
        throw new Error(json.error?.message ?? 'Failed to get upload URL')
      }
      const { signedUrl, storagePath } = await signRes.json()
      setProgress(25)

      // 2. Upload to storage
      const xhr = new XMLHttpRequest()
      await new Promise<void>((resolve, reject) => {
        xhr.upload.onprogress = e => {
          if (e.lengthComputable) {
            setProgress(25 + Math.round((e.loaded / e.total) * 55))
          }
        }
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('Upload failed')))
        xhr.onerror = () => reject(new Error('Network error'))
        xhr.open('PUT', signedUrl)
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
        xhr.send(file)
      })
      setProgress(85)

      // 3. Register artifact
      const fileType = detectFileType(file.name) ?? (isEbsd ? `ebsd_${ebsdFormat}` : acceptedTypes[0])
      const regRes = await fetch(`/api/phases/${phaseId}/artifacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: label.trim(),
          fileType,
          storagePath,
          fileName: file.name,
          fileSize: file.size,
          ...(isEbsd && { ebsdFormat }),
          metadata: Object.fromEntries(
            Object.entries(metadata).filter(([, v]) => v.trim())
          ),
        }),
      })
      if (!regRes.ok) {
        const json = await regRes.json()
        throw new Error(json.error?.message ?? 'Failed to register artifact')
      }
      setProgress(100)

      // Reset
      setFile(null)
      setLabel('')
      setMetadata({ shield_gas: '', heat_treatment: '', process_parameters: '' })
      setProgress(0)
      onUploaded()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const acceptedTypesDisplay = isEbsd
    ? [FILE_TYPE_DISPLAY[`ebsd_${ebsdFormat}`]]
    : acceptedTypes.map(t => FILE_TYPE_DISPLAY[t] ?? t)

  return (
    <div className="space-y-4">
      {/* EBSD format selector */}
      {isEbsd && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">EBSD Format</Label>
          <div className="flex gap-2">
            {(['ang', 'ctf'] as const).map(fmt => (
              <button
                key={fmt}
                type="button"
                onClick={() => { setEbsdFormat(fmt); setFile(null); setError('') }}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium border transition-colors',
                  ebsdFormat === fmt
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border text-muted-foreground hover:bg-accent'
                )}
              >
                .{fmt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Label */}
      <div className="space-y-1.5">
        <Label htmlFor={`label-${phaseId}`} className="text-xs font-medium">
          Label <span className="text-destructive">*</span>
        </Label>
        <Input
          id={`label-${phaseId}`}
          placeholder="e.g. Ar-HT1"
          value={label}
          onChange={e => setLabel(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !file && fileRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          dragging
            ? 'border-primary bg-primary/5'
            : file
            ? 'border-green-400 bg-green-50'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30'
        )}
      >
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <div className="text-left min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
            </div>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setFile(null); setError('') }}
              className="p-1 hover:bg-destructive/10 rounded-sm transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Drop file here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">
                Accepts: {acceptedTypesDisplay.join(', ')}
              </p>
            </div>
          </div>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept={acceptExtensions}
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) handleFileSelect(f)
          e.target.value = ''
        }}
      />

      {/* Metadata */}
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

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-destructive text-xs">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Progress */}
      {uploading && progress > 0 && (
        <Progress value={progress} className="h-1.5" />
      )}

      {/* Upload button */}
      <Button
        type="button"
        onClick={handleUpload}
        disabled={!file || !label.trim() || uploading}
        className="w-full"
        size="sm"
      >
        {uploading ? `Uploading... ${progress}%` : 'Upload Artifact'}
      </Button>
    </div>
  )
}
