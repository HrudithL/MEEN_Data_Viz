import type { ParseResult } from './index'

interface PlyProperty {
  name: string
  type: string
}

interface PlyElement {
  name: string
  count: number
  properties: PlyProperty[]
}

interface PlyHeader {
  elements: PlyElement[]
  format: 'ascii' | 'binary_little_endian' | 'binary_big_endian'
  headerBytes: number
}

const PLY_TYPE_SIZES: Record<string, number> = {
  char: 1, uchar: 1, short: 2, ushort: 2,
  int: 4, uint: 4, float: 4, double: 8,
  int8: 1, uint8: 1, int16: 2, uint16: 2,
  int32: 4, uint32: 4, float32: 4, float64: 8,
}

function parsePlyHeader(buffer: Buffer): PlyHeader {
  const text = buffer.toString('ascii', 0, Math.min(buffer.length, 4096))
  const lines = text.split(/\r?\n/)

  if (lines[0].trim() !== 'ply') throw new Error('Not a PLY file')

  let format: PlyHeader['format'] = 'ascii'
  const elements: PlyElement[] = []
  let currentElement: PlyElement | null = null
  let headerLines = 0

  for (let i = 0; i < lines.length; i++) {
    headerLines++
    const line = lines[i].trim()
    if (line === 'end_header') break

    const parts = line.split(/\s+/)
    if (parts[0] === 'format') {
      if (parts[1] === 'ascii') format = 'ascii'
      else if (parts[1] === 'binary_little_endian') format = 'binary_little_endian'
      else if (parts[1] === 'binary_big_endian') format = 'binary_big_endian'
    } else if (parts[0] === 'element') {
      if (currentElement) elements.push(currentElement)
      currentElement = { name: parts[1], count: parseInt(parts[2]), properties: [] }
    } else if (parts[0] === 'property' && currentElement) {
      if (parts[1] === 'list') {
        // list property — skip for bounding box purposes
        currentElement.properties.push({ name: parts[4], type: `list:${parts[2]}:${parts[3]}` })
      } else {
        currentElement.properties.push({ name: parts[2], type: parts[1] })
      }
    }
  }
  if (currentElement) elements.push(currentElement)

  // Count actual header bytes
  let byteCount = 0
  let lineIdx = 0
  for (lineIdx = 0; lineIdx < headerLines; lineIdx++) {
    byteCount += Buffer.byteLength(lines[lineIdx], 'ascii') + 1 // +1 for \n
    if (lines[lineIdx].trim() === 'end_header') {
      lineIdx++
      break
    }
  }
  // Adjust for \r\n
  const rawHeader = buffer.toString('ascii', 0, Math.min(buffer.length, 8192))
  const endHeaderIdx = rawHeader.indexOf('end_header')
  let headerBytes = endHeaderIdx + 'end_header'.length
  if (rawHeader[headerBytes] === '\r') headerBytes++
  if (rawHeader[headerBytes] === '\n') headerBytes++

  return { elements, format, headerBytes }
}

function getBBoxFromBinary(buffer: Buffer, header: PlyHeader): { pointCount: number; boundingBox: { min: number[]; max: number[] } } {
  const vertexEl = header.elements.find(e => e.name === 'vertex')
  if (!vertexEl) return { pointCount: 0, boundingBox: { min: [0, 0, 0], max: [0, 0, 0] } }

  const pointCount = vertexEl.count
  const props = vertexEl.properties

  // Compute stride (only for non-list properties)
  let stride = 0
  for (const p of props) {
    if (p.type.startsWith('list:')) {
      // Variable size — can't do fixed stride
      return { pointCount, boundingBox: { min: [0, 0, 0], max: [0, 0, 0] } }
    }
    stride += PLY_TYPE_SIZES[p.type] ?? 4
  }

  const xIdx = props.findIndex(p => p.name === 'x')
  const yIdx = props.findIndex(p => p.name === 'y')
  const zIdx = props.findIndex(p => p.name === 'z')

  if (xIdx < 0 || yIdx < 0 || zIdx < 0) {
    return { pointCount, boundingBox: { min: [0, 0, 0], max: [0, 0, 0] } }
  }

  const xOffset = props.slice(0, xIdx).reduce((s, p) => s + (PLY_TYPE_SIZES[p.type] ?? 4), 0)
  const yOffset = props.slice(0, yIdx).reduce((s, p) => s + (PLY_TYPE_SIZES[p.type] ?? 4), 0)
  const zOffset = props.slice(0, zIdx).reduce((s, p) => s + (PLY_TYPE_SIZES[p.type] ?? 4), 0)

  const xType = props[xIdx].type
  const yType = props[yIdx].type
  const zType = props[zIdx].type

  const le = header.format === 'binary_little_endian'

  let minX = Infinity, maxX = -Infinity
  let minY = Infinity, maxY = -Infinity
  let minZ = Infinity, maxZ = -Infinity

  const dataStart = header.headerBytes
  const limit = Math.min(pointCount, Math.floor((buffer.length - dataStart) / stride))

  for (let i = 0; i < limit; i++) {
    const base = dataStart + i * stride
    const x = readPlyFloat(buffer, base + xOffset, xType, le)
    const y = readPlyFloat(buffer, base + yOffset, yType, le)
    const z = readPlyFloat(buffer, base + zOffset, zType, le)

    if (isFinite(x) && isFinite(y) && isFinite(z)) {
      if (x < minX) minX = x; if (x > maxX) maxX = x
      if (y < minY) minY = y; if (y > maxY) maxY = y
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z
    }
  }

  if (!isFinite(minX)) return { pointCount, boundingBox: { min: [0, 0, 0], max: [0, 0, 0] } }

  return { pointCount, boundingBox: { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] } }
}

function readPlyFloat(buffer: Buffer, offset: number, type: string, le: boolean): number {
  if (offset + (PLY_TYPE_SIZES[type] ?? 4) > buffer.length) return NaN
  switch (type) {
    case 'float': case 'float32': return le ? buffer.readFloatLE(offset) : buffer.readFloatBE(offset)
    case 'double': case 'float64': return le ? buffer.readDoubleLE(offset) : buffer.readDoubleBE(offset)
    case 'int': case 'int32': return le ? buffer.readInt32LE(offset) : buffer.readInt32BE(offset)
    case 'uint': case 'uint32': return le ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset)
    case 'short': case 'int16': return le ? buffer.readInt16LE(offset) : buffer.readInt16BE(offset)
    case 'ushort': case 'uint16': return le ? buffer.readUInt16LE(offset) : buffer.readUInt16BE(offset)
    case 'char': case 'int8': return buffer.readInt8(offset)
    case 'uchar': case 'uint8': return buffer.readUInt8(offset)
    default: return le ? buffer.readFloatLE(offset) : buffer.readFloatBE(offset)
  }
}

function getBBoxFromAscii(text: string, header: PlyHeader): { pointCount: number; boundingBox: { min: number[]; max: number[] } } {
  const vertexEl = header.elements.find(e => e.name === 'vertex')
  if (!vertexEl) return { pointCount: 0, boundingBox: { min: [0, 0, 0], max: [0, 0, 0] } }

  const pointCount = vertexEl.count
  const props = vertexEl.properties
  const xIdx = props.findIndex(p => p.name === 'x')
  const yIdx = props.findIndex(p => p.name === 'y')
  const zIdx = props.findIndex(p => p.name === 'z')

  if (xIdx < 0 || yIdx < 0 || zIdx < 0) {
    return { pointCount, boundingBox: { min: [0, 0, 0], max: [0, 0, 0] } }
  }

  const lines = text.split(/\r?\n/)
  const endHeader = lines.findIndex(l => l.trim() === 'end_header')
  const dataLines = lines.slice(endHeader + 1)

  let minX = Infinity, maxX = -Infinity
  let minY = Infinity, maxY = -Infinity
  let minZ = Infinity, maxZ = -Infinity

  const limit = Math.min(pointCount, dataLines.length)

  for (let i = 0; i < limit; i++) {
    const parts = dataLines[i].trim().split(/\s+/)
    const x = parseFloat(parts[xIdx])
    const y = parseFloat(parts[yIdx])
    const z = parseFloat(parts[zIdx])

    if (isFinite(x) && isFinite(y) && isFinite(z)) {
      if (x < minX) minX = x; if (x > maxX) maxX = x
      if (y < minY) minY = y; if (y > maxY) maxY = y
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z
    }
  }

  if (!isFinite(minX)) return { pointCount, boundingBox: { min: [0, 0, 0], max: [0, 0, 0] } }

  return { pointCount, boundingBox: { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] } }
}

export async function parsePly(buffer: Buffer): Promise<ParseResult> {
  try {
    const header = parsePlyHeader(buffer)

    let result: { pointCount: number; boundingBox: { min: number[]; max: number[] } }

    if (header.format === 'ascii') {
      const text = buffer.toString('utf-8')
      result = getBBoxFromAscii(text, header)
    } else {
      result = getBBoxFromBinary(buffer, header)
    }

    return {
      parsedJson: {
        kind: 'point_cloud',
        format: 'ply',
        pointCount: result.pointCount,
        boundingBox: result.boundingBox,
      },
      parseStatus: 'ok',
    }
  } catch (e) {
    return {
      parsedJson: { kind: 'point_cloud', format: 'ply', pointCount: 0, boundingBox: { min: [0, 0, 0], max: [0, 0, 0] } },
      parseStatus: 'failed',
      error: e instanceof Error ? e.message : 'PLY parse error',
    }
  }
}
