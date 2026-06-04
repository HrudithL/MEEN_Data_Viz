'use client'

import dynamic from 'next/dynamic'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import type { ParsedJson } from '@/types/database'

function LoadingSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div
      className="animate-pulse rounded-lg bg-muted"
      style={{ height }}
      aria-label="Loading..."
    />
  )
}

export interface ArtifactSummary {
  id: string
  fileType: string
  parsedJson: ParsedJson | null
  parseStatus: string
  storagePath: string
  fileName: string
}

export interface ViewerProps {
  artifact: ArtifactSummary
  density?: 'full' | 'compact'
  signedUrl?: string
}

// Lazy-loaded viewers
const CsvViewer = dynamic(() => import('./CsvViewer').then(m => ({ default: m.CsvViewer })), {
  loading: () => <LoadingSkeleton height={300} />,
  ssr: false,
})

const StlViewer = dynamic(() => import('./StlViewer').then(m => ({ default: m.StlViewer })), {
  loading: () => <LoadingSkeleton height={300} />,
  ssr: false,
})

const PlyViewer = dynamic(() => import('./PlyViewer').then(m => ({ default: m.PlyViewer })), {
  loading: () => <LoadingSkeleton height={300} />,
  ssr: false,
})

const PngViewer = dynamic(() => import('./PngViewer').then(m => ({ default: m.PngViewer })), {
  loading: () => <LoadingSkeleton height={300} />,
  ssr: false,
})

const EbsdViewer = dynamic(() => import('./EbsdViewer').then(m => ({ default: m.EbsdViewer })), {
  loading: () => <LoadingSkeleton height={300} />,
  ssr: false,
})

const TiffViewer = dynamic(() => import('./TiffViewer').then(m => ({ default: m.TiffViewer })), {
  loading: () => <LoadingSkeleton height={300} />,
  ssr: false,
})

export function ViewerRegistry({ artifact, density = 'full', signedUrl }: ViewerProps) {
  const { parsedJson, parseStatus, fileName, fileType, id } = artifact

  if (parseStatus === 'failed') {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          This file could not be parsed. It may be corrupted or in an unsupported format.
        </AlertDescription>
      </Alert>
    )
  }

  if (!parsedJson) {
    return <LoadingSkeleton height={density === 'compact' ? 120 : 300} />
  }

  switch (parsedJson.kind) {
    case 'table':
      return (
        <CsvViewer
          parsedJson={parsedJson}
          artifact={artifact}
          density={density}
        />
      )

    case 'mesh':
      if (!signedUrl) return <LoadingSkeleton height={density === 'compact' ? 200 : 500} />
      return <StlViewer signedUrl={signedUrl} density={density} />

    case 'point_cloud':
      if (!signedUrl) return <LoadingSkeleton height={density === 'compact' ? 200 : 500} />
      return <PlyViewer signedUrl={signedUrl} density={density} />

    case 'image':
      if (!signedUrl) return <LoadingSkeleton height={density === 'compact' ? 200 : 400} />
      return <PngViewer signedUrl={signedUrl} fileName={fileName} />

    case 'ebsd_grid':
      return <EbsdViewer parsedJson={parsedJson} density={density} />

    case 'slice_stack': {
      // Extract buildId from artifact id context — pass artifact id as buildId fallback
      const buildId = id
      return <TiffViewer parsedJson={parsedJson} buildId={buildId} density={density} />
    }

    default:
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No viewer available for this file type ({fileType}).
          </AlertDescription>
        </Alert>
      )
  }
}
