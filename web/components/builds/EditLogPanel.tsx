'use client'

import { useEffect, useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { Download, ChevronRight, Loader2, FileDiff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ChangelogEntry, Profile } from '@/types/database'

type ChangelogRow = ChangelogEntry & {
  profiles: Pick<Profile, 'id' | 'email' | 'display_name'> | null
}

interface EditLogPanelProps {
  buildId: string
}

interface FileDiffInfo {
  previousStoragePath?: string
  previousFileName?: string
  newStoragePath?: string
  newFileName?: string
  previousVersion?: number
  version?: number
  artifactId?: string
}

function fileExt(name?: string): string {
  return name?.split('.').pop()?.toLowerCase() ?? ''
}

function isImageExt(ext: string): boolean {
  return ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)
}

function isTextExt(ext: string): boolean {
  return ['csv', 'txt', 'md', 'json', 'ang', 'ctf'].includes(ext)
}

function DiffContent({
  content,
  fileName,
  signedUrl,
}: {
  content: string | null
  fileName?: string
  signedUrl?: string
}) {
  if (content === null) {
    return <p className="text-xs text-muted-foreground italic">(empty)</p>
  }

  const ext = fileExt(fileName)

  if (signedUrl && isImageExt(ext)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={signedUrl} alt={fileName ?? 'preview'} className="max-h-[320px] w-full object-contain rounded border bg-zinc-950" />
    )
  }

  if (isTextExt(ext)) {
    return (
      <pre className="text-xs bg-muted/50 border rounded p-2 max-h-[360px] overflow-auto whitespace-pre-wrap font-sans">
        {content}
      </pre>
    )
  }

  return (
    <div className="text-xs bg-muted/50 border rounded p-3 space-y-2">
      <p className="text-muted-foreground">Binary or 3D file preview unavailable.</p>
      {signedUrl && (
        <Button variant="outline" size="sm" className="h-7 text-xs" render={<a href={signedUrl} download={fileName} />}>
          <Download className="h-3 w-3 mr-1" />
          Download {fileName ?? 'file'}
        </Button>
      )}
    </div>
  )
}

export function EditLogPanel({ buildId }: EditLogPanelProps) {
  const [entries, setEntries] = useState<ChangelogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [oldContent, setOldContent] = useState<string | null>(null)
  const [newContent, setNewContent] = useState<string | null>(null)
  const [oldUrl, setOldUrl] = useState<string | null>(null)
  const [newUrl, setNewUrl] = useState<string | null>(null)
  const [oldFileName, setOldFileName] = useState<string | undefined>()
  const [newFileName, setNewFileName] = useState<string | undefined>()
  const [loadingDiff, setLoadingDiff] = useState(false)

  useEffect(() => {
    fetch(`/api/builds/${buildId}/changelog?limit=100`, { cache: 'no-store' })
      .then(r => r.json())
      .then(json => setEntries(json.data ?? []))
      .finally(() => setLoading(false))
  }, [buildId])

  const selected = entries.find(e => e.id === selectedId)

  async function signedUrlFor(path: string): Promise<string | null> {
    const urlRes = await fetch(`/api/storage/sign-download?storagePath=${encodeURIComponent(path)}`)
    const urlJson = await urlRes.json()
    return urlJson.data?.signedUrl ?? null
  }

  async function fetchTextFromPath(path: string): Promise<string> {
    const url = await signedUrlFor(path)
    if (!url) return '(unable to load)'
    const res = await fetch(url)
    const text = await res.text()
    return text.length > 50000 ? text.slice(0, 50000) + '\n…(truncated)' : text
  }

  async function loadDiff(entry: ChangelogRow) {
    setSelectedId(entry.id)
    setLoadingDiff(true)
    setOldContent(null)
    setNewContent(null)
    setOldUrl(null)
    setNewUrl(null)
    setOldFileName(undefined)
    setNewFileName(undefined)

    const diff = (entry.diff ?? {}) as FileDiffInfo
    const meta = (entry.metadata ?? {}) as Record<string, unknown>

    try {
      if (entry.action === 'create') {
        const path = (diff.newStoragePath ?? meta.storagePath) as string | undefined
        const name = (diff.newFileName ?? meta.fileName) as string | undefined
        if (path) {
          const [url, text] = await Promise.all([
            signedUrlFor(path),
            fetchTextFromPath(path).catch(() => null),
          ])
          setOldContent(null)
          setNewContent(text)
          setNewUrl(url)
          setNewFileName(name)
        }
      } else if (entry.action === 'version_create' && diff.previousStoragePath && diff.newStoragePath) {
        const [oldUrlVal, newUrlVal, oldT, newT] = await Promise.all([
          signedUrlFor(diff.previousStoragePath),
          signedUrlFor(diff.newStoragePath),
          fetchTextFromPath(diff.previousStoragePath).catch(() => '(binary or unavailable)'),
          fetchTextFromPath(diff.newStoragePath).catch(() => '(binary or unavailable)'),
        ])
        setOldUrl(oldUrlVal)
        setNewUrl(newUrlVal)
        setOldContent(oldT)
        setNewContent(newT)
        setOldFileName(diff.previousFileName)
        setNewFileName(diff.newFileName)
      } else if (entry.entity_type === 'column_dictionary' && diff && 'before' in (diff as object)) {
        const d = diff as { before?: unknown; after?: unknown; column?: string }
        setOldContent(String(d.before ?? ''))
        setNewContent(String(d.after ?? ''))
      } else if (entry.action === 'delete') {
        setOldContent(`Deleted: ${(meta.label as string) ?? (meta.fileName as string) ?? entry.entity_id}`)
        setNewContent(null)
      }
    } finally {
      setLoadingDiff(false)
    }
  }

  const diff = (selected?.diff ?? {}) as FileDiffInfo

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Edit history for the last 30 days. Older entries are automatically purged.
      </p>

      {entries.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No edits recorded yet</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="border rounded-lg divide-y max-h-[600px] overflow-y-auto">
            {entries.map(entry => (
              <button
                key={entry.id}
                type="button"
                onClick={() => loadDiff(entry)}
                className={cn(
                  'w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors flex items-start gap-2',
                  selectedId === entry.id && 'bg-muted/60'
                )}
              >
                <ChevronRight className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs capitalize">
                      {entry.entity_type.replace('_', ' ')}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {entry.action}
                    </Badge>
                  </div>
                  <p className="text-sm mt-1 truncate">
                    {(entry.metadata as { fileName?: string; label?: string })?.fileName ??
                      (entry.metadata as { label?: string })?.label ??
                      entry.entity_id?.slice(0, 8)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {entry.profiles?.display_name ?? entry.profiles?.email ?? 'Unknown'} ·{' '}
                    {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <div className="border rounded-lg p-4 min-h-[300px]">
            {!selected ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                <FileDiff className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">Select an edit to view details</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium text-sm">Edit Details</h3>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(selected.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>

                {loadingDiff ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : oldContent !== null || newContent !== null ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Before</p>
                      <DiffContent content={oldContent} fileName={oldFileName} signedUrl={oldUrl ?? undefined} />
                      {diff.previousStoragePath && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 h-7 text-xs"
                          onClick={async () => {
                            const url = await signedUrlFor(diff.previousStoragePath!)
                            if (url) window.open(url, '_blank')
                          }}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download old
                        </Button>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">After</p>
                      <DiffContent content={newContent} fileName={newFileName} signedUrl={newUrl ?? undefined} />
                      {diff.newStoragePath && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 h-7 text-xs"
                          onClick={async () => {
                            const url = await signedUrlFor(diff.newStoragePath!)
                            if (url) window.open(url, '_blank')
                          }}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download new
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No visual diff available for this entry.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
