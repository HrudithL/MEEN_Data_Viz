import type { ParsedJson, ColumnDictionary } from '@/types/database'

export interface ParseResult {
  parsedJson: ParsedJson
  columnDictionary?: ColumnDictionary
  parseStatus: 'ok' | 'partial' | 'failed'
  error?: string
}

export async function parseArtifact(
  buffer: Buffer,
  fileType: string,
  options?: { ebsdFormat?: 'ang' | 'ctf' }
): Promise<ParseResult> {
  try {
    switch (fileType) {
      case 'csv': {
        const { parseCsv } = await import('./csv')
        return parseCsv(buffer)
      }
      case 'stl': {
        const { parseStl } = await import('./stl')
        return parseStl(buffer)
      }
      case 'ply': {
        const { parsePly } = await import('./ply')
        return parsePly(buffer)
      }
      case 'png': {
        const { parsePng } = await import('./png')
        return parsePng(buffer)
      }
      case 'ebsd_ang':
      case 'ebsd_ctf': {
        const { parseEbsd } = await import('./ebsd')
        return parseEbsd(buffer, fileType === 'ebsd_ang' ? 'ang' : 'ctf')
      }
      case 'tiff_zip': {
        const { parseTiffZip } = await import('./tiff-zip')
        return parseTiffZip(buffer)
      }
      case 'mtex': {
        const { parseMtex } = await import('./mtex')
        return parseMtex(buffer)
      }
      default:
        return { parsedJson: { kind: 'image', format: 'png', width: 0, height: 0 }, parseStatus: 'failed', error: 'Unknown file type' }
    }
  } catch (e) {
    return {
      parsedJson: { kind: 'table', tables: [] },
      parseStatus: 'failed',
      error: e instanceof Error ? e.message : 'Parse error',
    }
  }
}
