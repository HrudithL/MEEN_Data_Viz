import type { ParseResult } from './index'

const MAX_SLICES = 500

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

export async function parseTiffZip(buffer: Buffer): Promise<ParseResult> {
  try {
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

    const limited = tiffFiles.slice(0, MAX_SLICES)

    const slices = limited.map((filePath, index) => ({
      index,
      storagePath: '', // filled in by API route after extraction
    }))

    return {
      parsedJson: {
        kind: 'slice_stack',
        sliceCount: limited.length,
        slices,
      },
      parseStatus: limited.length > 0 ? 'ok' : 'partial',
      error: limited.length === 0 ? 'No TIFF files found in ZIP archive' : undefined,
    }
  } catch (e) {
    return {
      parsedJson: { kind: 'slice_stack', sliceCount: 0, slices: [] },
      parseStatus: 'failed',
      error: e instanceof Error ? e.message : 'TIFF ZIP parse error',
    }
  }
}
