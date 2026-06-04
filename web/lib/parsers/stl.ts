import type { ParseResult } from './index'

interface BBox {
  minX: number; maxX: number
  minY: number; maxY: number
  minZ: number; maxZ: number
}

function initBBox(): BBox {
  return { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity }
}

function expandBBox(box: BBox, x: number, y: number, z: number) {
  if (x < box.minX) box.minX = x
  if (x > box.maxX) box.maxX = x
  if (y < box.minY) box.minY = y
  if (y > box.maxY) box.maxY = y
  if (z < box.minZ) box.minZ = z
  if (z > box.maxZ) box.maxZ = z
}

function finalizeBBox(box: BBox) {
  return {
    min: [box.minX, box.minY, box.minZ],
    max: [box.maxX, box.maxY, box.maxZ],
  }
}

function parseBinaryStl(buffer: Buffer): { triangleCount: number; boundingBox: { min: number[]; max: number[] } } {
  // 80-byte header, 4-byte triangle count
  const triangleCount = buffer.readUInt32LE(80)
  const box = initBBox()

  // Each triangle: 12 bytes normal + 3*(12 bytes vertex) + 2 bytes attribute = 50 bytes
  const expectedSize = 84 + triangleCount * 50
  const limit = Math.min(triangleCount, Math.floor((buffer.length - 84) / 50))

  for (let i = 0; i < limit; i++) {
    const base = 84 + i * 50 + 12 // skip normal vector (12 bytes)
    for (let v = 0; v < 3; v++) {
      const vBase = base + v * 12
      if (vBase + 12 > buffer.length) break
      const x = buffer.readFloatLE(vBase)
      const y = buffer.readFloatLE(vBase + 4)
      const z = buffer.readFloatLE(vBase + 8)
      if (isFinite(x) && isFinite(y) && isFinite(z)) {
        expandBBox(box, x, y, z)
      }
    }
  }

  if (!isFinite(box.minX)) {
    return { triangleCount, boundingBox: { min: [0, 0, 0], max: [0, 0, 0] } }
  }

  return { triangleCount, boundingBox: finalizeBBox(box) }
}

function parseAsciiStl(text: string): { triangleCount: number; boundingBox: { min: number[]; max: number[] } } {
  const box = initBBox()
  let triangleCount = 0
  const vertexRe = /vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g
  const facetRe = /facet\s+normal/g

  let m: RegExpExecArray | null
  while ((m = vertexRe.exec(text)) !== null) {
    const x = parseFloat(m[1])
    const y = parseFloat(m[2])
    const z = parseFloat(m[3])
    if (isFinite(x) && isFinite(y) && isFinite(z)) {
      expandBBox(box, x, y, z)
    }
  }
  while (facetRe.exec(text) !== null) triangleCount++

  if (!isFinite(box.minX)) {
    return { triangleCount, boundingBox: { min: [0, 0, 0], max: [0, 0, 0] } }
  }

  return { triangleCount, boundingBox: finalizeBBox(box) }
}

function isAsciiStl(buffer: Buffer): boolean {
  // Check if file starts with "solid" (ASCII STL)
  const header = buffer.slice(0, 5).toString('ascii').toLowerCase()
  if (!header.startsWith('solid')) return false

  // Binary STLs can also start with "solid" — check further
  // If we can read a valid binary triangle count and size matches, it's binary
  if (buffer.length < 84) return true
  const triangleCount = buffer.readUInt32LE(80)
  const expectedBinarySize = 84 + triangleCount * 50
  // Allow 1% tolerance
  if (Math.abs(buffer.length - expectedBinarySize) < 4) return false

  return true
}

export async function parseStl(buffer: Buffer): Promise<ParseResult> {
  try {
    if (buffer.length < 84) {
      // Try ASCII anyway
      const text = buffer.toString('utf-8')
      if (text.toLowerCase().includes('solid')) {
        const result = parseAsciiStl(text)
        return {
          parsedJson: { kind: 'mesh', format: 'stl', ...result },
          parseStatus: 'ok',
        }
      }
      return {
        parsedJson: { kind: 'mesh', format: 'stl', triangleCount: 0, boundingBox: { min: [0, 0, 0], max: [0, 0, 0] } },
        parseStatus: 'failed',
        error: 'File too small to be a valid STL',
      }
    }

    const ascii = isAsciiStl(buffer)

    if (ascii) {
      const text = buffer.toString('utf-8')
      const result = parseAsciiStl(text)
      return {
        parsedJson: { kind: 'mesh', format: 'stl', ...result },
        parseStatus: 'ok',
      }
    } else {
      const result = parseBinaryStl(buffer)
      return {
        parsedJson: { kind: 'mesh', format: 'stl', ...result },
        parseStatus: 'ok',
      }
    }
  } catch (e) {
    return {
      parsedJson: { kind: 'mesh', format: 'stl', triangleCount: 0, boundingBox: { min: [0, 0, 0], max: [0, 0, 0] } },
      parseStatus: 'failed',
      error: e instanceof Error ? e.message : 'STL parse error',
    }
  }
}
