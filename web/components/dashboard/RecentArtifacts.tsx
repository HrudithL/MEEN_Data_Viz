'use client'

import Link from 'next/link'
import { FileText, ExternalLink } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatBytes } from '@/lib/utils'
import { FILE_TYPE_DISPLAY } from '@/lib/constants'
import type { Artifact } from '@/types/database'

type RecentArtifact = Artifact & { phaseName: string; buildName: string; buildId?: string }

interface RecentArtifactsProps {
  artifacts: RecentArtifact[]
}

const PARSE_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive'> = {
  ok: 'default',
  partial: 'secondary',
  failed: 'destructive',
}

export function RecentArtifacts({ artifacts }: RecentArtifactsProps) {
  if (artifacts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Artifacts</CardTitle>
          <CardDescription>Latest uploaded files across all builds</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <FileText className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">No artifacts uploaded yet</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Artifacts</CardTitle>
        <CardDescription>Latest {artifacts.length} uploaded files across all builds</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead>Build</TableHead>
              <TableHead>Phase</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {artifacts.map(artifact => (
              <TableRow key={artifact.id}>
                <TableCell className="font-medium">{artifact.label}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {artifact.buildName}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {artifact.phaseName}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {FILE_TYPE_DISPLAY[artifact.file_type] ?? artifact.file_type}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatBytes(artifact.file_size)}
                </TableCell>
                <TableCell>
                  <Badge variant={PARSE_STATUS_VARIANT[artifact.parse_status] ?? 'secondary'}>
                    {artifact.parse_status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {artifact.buildId && (
                    <Link
                      href={`/builds/${artifact.buildId}/data`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
