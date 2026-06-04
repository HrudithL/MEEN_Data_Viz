'use client'

import { useRef, useState } from 'react'
import { Image as ImageIcon, Plus, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PhaseSupplement } from '@/types/database'

interface SupplementGalleryProps {
  phaseId: string
  orgId: string
  buildId: string
  initialSupplements: PhaseSupplement[]
  signedUrls?: Record<string, string>
  canEdit?: boolean
}

export function SupplementGallery({
  phaseId,
  orgId,
  buildId,
  initialSupplements,
  canEdit = false,
}: SupplementGalleryProps) {
  const [supplements, setSupplements] = useState<PhaseSupplement[]>(initialSupplements)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({})
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Only image files allowed as supplements')
      return
    }
    setUploading(true)
    setError('')

    try {
      // 1. Get signed URL
      const signRes = await fetch('/api/storage/sign-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          buildId,
          phaseId,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        }),
      })
      const { signedUrl, storagePath } = await signRes.json()
      if (!signedUrl) throw new Error('Failed to get upload URL')

      // 2. Upload
      await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'content-type': file.type },
      })

      // 3. Register supplement
      const regRes = await fetch(`/api/phases/${phaseId}/supplements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath, fileName: file.name }),
      })
      if (!regRes.ok) {
        const json = await regRes.json()
        throw new Error(json.error?.message ?? 'Failed to register supplement')
      }
      const { data: supplement } = await regRes.json()
      setSupplements(prev => [...prev, supplement])

      // Show local preview
      const reader = new FileReader()
      reader.onload = e => {
        if (supplement?.id && e.target?.result) {
          setThumbnails(prev => ({ ...prev, [supplement.id]: e.target!.result as string }))
        }
      }
      reader.readAsDataURL(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/supplements/${id}`, { method: 'DELETE' })
      setSupplements(prev => prev.filter(s => s.id !== id))
    } catch {
      setError('Failed to delete')
    }
  }

  async function getSignedUrl(storagePath: string): Promise<string> {
    const res = await fetch(`/api/storage/sign-download?storagePath=${encodeURIComponent(storagePath)}`)
    const json = await res.json()
    return json.signedUrl ?? ''
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">Supplement Images</h4>
        {canEdit && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              <Plus className="h-3 w-3" />
              {uploading ? 'Uploading...' : 'Add Image'}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) handleUpload(f)
                e.target.value = ''
              }}
            />
          </>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {supplements.length === 0 ? (
        canEdit ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 transition-colors"
          >
            <Upload className="h-6 w-6 mb-1" />
            <span className="text-xs">Upload supplement images</span>
          </button>
        ) : (
          <p className="text-xs text-muted-foreground italic">No supplement images</p>
        )
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {supplements.map(supp => (
            <div key={supp.id} className="relative group aspect-square">
              <SupplementThumbnail
                supplement={supp}
                localUrl={thumbnails[supp.id]}
                getSignedUrl={getSignedUrl}
              />
              {canEdit && (
                <button
                  onClick={() => handleDelete(supp.id)}
                  className="absolute top-1 right-1 p-0.5 bg-destructive text-destructive-foreground rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SupplementThumbnail({
  supplement,
  localUrl,
  getSignedUrl,
}: {
  supplement: PhaseSupplement
  localUrl?: string
  getSignedUrl: (path: string) => Promise<string>
}) {
  const [url, setUrl] = useState(localUrl ?? '')

  async function loadUrl() {
    if (url) return
    const signed = await getSignedUrl(supplement.storage_path)
    setUrl(signed)
  }

  return (
    <div
      className="w-full h-full bg-muted rounded-md overflow-hidden border cursor-pointer hover:opacity-90 transition-opacity flex items-center justify-center"
      onMouseEnter={loadUrl}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={supplement.caption ?? supplement.file_name}
          className="w-full h-full object-cover"
        />
      ) : (
        <ImageIcon className="h-5 w-5 text-muted-foreground" />
      )}
    </div>
  )
}
