'use client'

import { useEffect, useState } from 'react'
import type { ParsedJson } from '@/types/database'
import { formatBytes } from '@/lib/utils'

interface MtexViewerProps {
  parsedJson: Extract<ParsedJson, { kind: 'mtex_map' }>
  fileName: string
  signedUrl?: string
  density?: 'full' | 'compact'
}

export function MtexViewer({ parsedJson, fileName, signedUrl, density = 'full' }: MtexViewerProps) {
  const height = density === 'compact' ? 160 : 320
  const [preview, setPreview] = useState('')

  useEffect(() => {
    if (!signedUrl) return
    fetch(signedUrl)
      .then(r => r.text())
      .then(text => setPreview(text.slice(0, 2000)))
      .catch(() => setPreview(''))
  }, [signedUrl])

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span>MTEX map</span>
        <span>{formatBytes(parsedJson.fileSize)}</span>
        <span className="truncate max-w-[200px]">{fileName}</span>
      </div>

      <div
        className="relative rounded-md border overflow-hidden bg-zinc-950"
        style={{ minHeight: height }}
      >
        <pre className="text-xs text-emerald-300/90 p-4 max-h-[320px] overflow-auto whitespace-pre-wrap font-mono">
          {preview || 'Loading MTEX preview...'}
        </pre>
      </div>

      {signedUrl && density === 'full' && (
        <a
          href={signedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline"
        >
          Download original file
        </a>
      )}
    </div>
  )
}
