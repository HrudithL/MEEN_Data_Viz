import type { ParseResult } from './index'

/** Minimal MTEX artifact parse — full map rendering deferred; metadata for viewer shell. */
export async function parseMtex(buffer: Buffer): Promise<ParseResult> {
  if (buffer.length === 0) {
    return {
      parsedJson: { kind: 'mtex_map', format: 'mtex', fileSize: 0 },
      parseStatus: 'failed',
      error: 'Empty MTEX file',
    }
  }

  return {
    parsedJson: {
      kind: 'mtex_map',
      format: 'mtex',
      fileSize: buffer.length,
    },
    parseStatus: 'ok',
  }
}
