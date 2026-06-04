import type { ParseResult } from './index'

// PNG magic bytes: 137 80 78 71 13 10 26 10
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

export async function parsePng(buffer: Buffer): Promise<ParseResult> {
  try {
    if (buffer.length < 24) {
      return {
        parsedJson: { kind: 'image', format: 'png', width: 0, height: 0 },
        parseStatus: 'failed',
        error: 'File too small to be a valid PNG',
      }
    }

    // Verify magic bytes
    for (let i = 0; i < 8; i++) {
      if (buffer[i] !== PNG_MAGIC[i]) {
        return {
          parsedJson: { kind: 'image', format: 'png', width: 0, height: 0 },
          parseStatus: 'failed',
          error: 'Not a valid PNG file (magic bytes mismatch)',
        }
      }
    }

    // IHDR chunk starts at byte 8:
    // bytes 8-11:  chunk length (4 bytes, big-endian)
    // bytes 12-15: chunk type "IHDR"
    // bytes 16-19: width  (4 bytes, big-endian uint32)
    // bytes 20-23: height (4 bytes, big-endian uint32)
    const chunkType = buffer.toString('ascii', 12, 16)
    if (chunkType !== 'IHDR') {
      return {
        parsedJson: { kind: 'image', format: 'png', width: 0, height: 0 },
        parseStatus: 'failed',
        error: 'PNG IHDR chunk not found at expected position',
      }
    }

    const width = buffer.readUInt32BE(16)
    const height = buffer.readUInt32BE(20)

    return {
      parsedJson: { kind: 'image', format: 'png', width, height },
      parseStatus: 'ok',
    }
  } catch (e) {
    return {
      parsedJson: { kind: 'image', format: 'png', width: 0, height: 0 },
      parseStatus: 'failed',
      error: e instanceof Error ? e.message : 'PNG parse error',
    }
  }
}
