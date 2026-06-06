import type { ParsedJson } from '@/types/database'
import type { ParseResult } from './index'
import type { createServiceClient } from '@/lib/supabase/service'

const MAX_SLICES = 500

export type TiffStorageContext = {
  serviceSb: ReturnType<typeof createServiceClient>
  orgId: string
  buildId: string
  phaseId: string
  artifactId: string
}

function naturalSort(a: string, b: string): number {
  const re = /(\d+)/g
  const aParts = a.split(re)
  const bParts = b.split(re)
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const ap = aParts[i] ?? ''
    const bp = bParts[i] ?? ''
    if (!isNaN(Number(ap)) && !isNaN(Number(bp))) {
      const diff = Number(ap) - Number(bp)
      if (diff !== 0) return diff
    } else {
      if (ap < bp) return -1
      if (ap > bp) return 1
    }
  }
  return 0
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function sliceStoragePath(ctx: TiffStorageContext, index: number, fileName: string): string {
  const safeName = sanitizeFileName(fileName)
  const padded = String(index).padStart(4, '0')
  return `org/${ctx.orgId}/build/${ctx.buildId}/phase/${ctx.phaseId}/artifact/${ctx.artifactId}/slices/${padded}/${safeName}`
}

async function listTiffPathsInZip(buffer: Buffer): Promise<string[]> {
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(buffer)
  const tiffFiles: string[] = []

  zip.forEach((relativePath, file) => {
    if (file.dir) return
    const lower = relativePath.toLowerCase()
    if (lower.endsWith('.tif') || lower.endsWith('.tiff')) {
      tiffFiles.push(relativePath)
    }
  })

  tiffFiles.sort(naturalSort)
  return tiffFiles.slice(0, MAX_SLICES)
}

function sliceStackNeedsExtraction(parsedJson: unknown): parsedJson is Extract<ParsedJson, { kind: 'slice_stack' }> {
  if (!parsedJson || typeof parsedJson !== 'object') return false
  const parsed = parsedJson as { kind?: string; slices?: { storagePath?: string }[] }
  if (parsed.kind !== 'slice_stack' || !Array.isArray(parsed.slices) || parsed.slices.length === 0) {
    return false
  }
  return parsed.slices.some(slice => !slice.storagePath)
}

export async function parseAndStoreTiffZip(buffer: Buffer, ctx: TiffStorageContext): Promise<ParseResult> {
  try {
    const JSZip = (await import('jszip')).default
    const zip = await JSZip.loadAsync(buffer)
    const tiffPaths: string[] = []

    zip.forEach((relativePath, file) => {
      if (file.dir) return
      const lower = relativePath.toLowerCase()
      if (lower.endsWith('.tif') || lower.endsWith('.tiff')) {
        tiffPaths.push(relativePath)
      }
    })

    tiffPaths.sort(naturalSort)
    const limited = tiffPaths.slice(0, MAX_SLICES)

    if (limited.length === 0) {
      return {
        parsedJson: { kind: 'slice_stack', sliceCount: 0, slices: [] },
        parseStatus: 'partial',
        error: 'No TIFF files found in ZIP archive',
      }
    }

    const slices: { index: number; storagePath: string }[] = []
    let uploadFailures = 0

    for (let index = 0; index < limited.length; index++) {
      const zipPath = limited[index]
      const entry = zip.file(zipPath)
      if (!entry) {
        uploadFailures++
        continue
      }

      const data = await entry.async('nodebuffer')
      const baseName = zipPath.split('/').pop() ?? `slice-${index}.tiff`
      const storagePath = sliceStoragePath(ctx, index, baseName)

      const { error } = await ctx.serviceSb.storage.from('build-artifacts').upload(storagePath, data, {
        contentType: 'image/tiff',
        upsert: true,
      })

      if (error) {
        uploadFailures++
        continue
      }

      slices.push({ index, storagePath })
    }

    return {
      parsedJson: {
        kind: 'slice_stack',
        sliceCount: slices.length,
        slices,
      },
      parseStatus: slices.length === 0 ? 'failed' : uploadFailures > 0 ? 'partial' : 'ok',
      error:
        slices.length === 0
          ? 'Failed to extract TIFF slices from ZIP archive'
          : uploadFailures > 0
            ? `${uploadFailures} slice(s) failed to upload`
            : undefined,
    }
  } catch (e) {
    return {
      parsedJson: { kind: 'slice_stack', sliceCount: 0, slices: [] },
      parseStatus: 'failed',
      error: e instanceof Error ? e.message : 'TIFF ZIP parse error',
    }
  }
}

/** Metadata-only parse (no storage upload). Prefer parseAndStoreTiffZip at upload time. */
export async function parseTiffZip(buffer: Buffer): Promise<ParseResult> {
  try {
    const tiffPaths = await listTiffPathsInZip(buffer)
    const slices = tiffPaths.map((_, index) => ({ index, storagePath: '' }))

    return {
      parsedJson: {
        kind: 'slice_stack',
        sliceCount: tiffPaths.length,
        slices,
      },
      parseStatus: tiffPaths.length > 0 ? 'ok' : 'partial',
      error: tiffPaths.length === 0 ? 'No TIFF files found in ZIP archive' : undefined,
    }
  } catch (e) {
    return {
      parsedJson: { kind: 'slice_stack', sliceCount: 0, slices: [] },
      parseStatus: 'failed',
      error: e instanceof Error ? e.message : 'TIFF ZIP parse error',
    }
  }
}

export async function ensureTiffSlicePaths(
  ctx: TiffStorageContext,
  storagePath: string,
  parsedJson: unknown
): Promise<ParsedJson> {
  if (!sliceStackNeedsExtraction(parsedJson)) {
    return parsedJson as ParsedJson
  }

  const { data: fileData, error } = await ctx.serviceSb.storage.from('build-artifacts').download(storagePath)
  if (error || !fileData) {
    return parsedJson as ParsedJson
  }

  const buffer = Buffer.from(await fileData.arrayBuffer())
  const result = await parseAndStoreTiffZip(buffer, ctx)
  return result.parsedJson
}
