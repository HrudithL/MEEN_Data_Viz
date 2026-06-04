import type { ParseResult } from './index'

const MAX_DATA_POINTS = 100_000
const MAX_DATA_RETURNED = 50_000

// ─── ANG (.ang) parser ────────────────────────────────────────────────────────

interface AngHeader {
  ncols: number
  nrows: number
  xstep: number
  ystep: number
  phases: string[]
}

function parseAngHeader(lines: string[]): AngHeader {
  let ncols = 0
  let nrows = 0
  let xstep = 0
  let ystep = 0
  const phases: string[] = []
  let inPhaseBlock = false
  let currentPhase = ''

  for (const line of lines) {
    if (!line.startsWith('#')) break
    const content = line.slice(1).trim()

    if (content.startsWith('Phase')) {
      inPhaseBlock = true
      currentPhase = ''
    } else if (inPhaseBlock && content.startsWith('MaterialName')) {
      currentPhase = content.replace(/^MaterialName\s*/, '').trim()
      if (currentPhase) phases.push(currentPhase)
      inPhaseBlock = false
    }

    const m = content.match(/^(\w+)\s+(.+)$/)
    if (!m) continue
    const key = m[1].toUpperCase()
    const val = m[2].trim()

    switch (key) {
      case 'NCOLS_EVEN':
      case 'NCOLS_ODD':
        if (!ncols) ncols = parseInt(val)
        break
      case 'NROWS':
        nrows = parseInt(val)
        break
      case 'XSTEP':
        xstep = parseFloat(val)
        break
      case 'YSTEP':
        ystep = parseFloat(val)
        break
    }
  }

  return { ncols, nrows, xstep, ystep, phases }
}

function parseAngData(dataLines: string[]): { x: number; y: number; phi1: number; PHI: number; phi2: number; phaseIndex: number }[] {
  const result: { x: number; y: number; phi1: number; PHI: number; phi2: number; phaseIndex: number }[] = []
  const limit = Math.min(dataLines.length, MAX_DATA_RETURNED)

  for (let i = 0; i < limit; i++) {
    const line = dataLines[i].trim()
    if (!line || line.startsWith('#')) continue
    const parts = line.split(/\s+/)
    if (parts.length < 8) continue

    const phi1 = parseFloat(parts[0])
    const PHI = parseFloat(parts[1])
    const phi2 = parseFloat(parts[2])
    const x = parseFloat(parts[3])
    const y = parseFloat(parts[4])
    // parts[5] = IQ, parts[6] = CI
    const phaseIndex = parseInt(parts[7]) || 0

    if (isFinite(phi1) && isFinite(PHI) && isFinite(phi2) && isFinite(x) && isFinite(y)) {
      result.push({ x, y, phi1, PHI, phi2, phaseIndex })
    }
  }

  return result
}

async function parseAngBuffer(buffer: Buffer): Promise<ParseResult> {
  const text = buffer.toString('utf-8')
  const lines = text.split(/\r?\n/)

  const headerLines = lines.filter(l => l.startsWith('#'))
  const dataLines = lines.filter(l => !l.startsWith('#') && l.trim() !== '')

  const header = parseAngHeader(headerLines)
  const data = parseAngData(dataLines)

  const width = header.ncols || (data.length > 0 ? Math.round(Math.sqrt(data.length)) : 0)
  const height = header.nrows || (width > 0 ? Math.ceil(data.length / width) : 0)

  return {
    parsedJson: {
      kind: 'ebsd_grid',
      format: 'ang',
      width,
      height,
      phases: header.phases.length > 0 ? header.phases : ['Unknown'],
      stepSize: header.xstep || undefined,
      cols: width || undefined,
      rows: height || undefined,
      data,
    },
    parseStatus: 'ok',
  }
}

// ─── CTF (.ctf) parser ────────────────────────────────────────────────────────

interface CtfHeader {
  xCells: number
  yCells: number
  xStep: number
  yStep: number
  phases: string[]
}

function parseCtfHeader(text: string): { header: CtfHeader; dataStartLine: number } {
  const lines = text.split(/\r?\n/)
  let xCells = 0
  let yCells = 0
  let xStep = 0
  let yStep = 0
  const phases: string[] = []
  let dataStartLine = 0
  let inPhasesSection = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Data section starts after the column header line
    if (line.startsWith('Phase\t') || line.startsWith('Phase ') ||
        /^Phase\s+X\s+Y/.test(line) || /^Phase\s+X/.test(line)) {
      dataStartLine = i + 1
      break
    }

    if (line === 'Phases') {
      inPhasesSection = true
      continue
    }

    // Phase names in CTF are listed after the "Phases" keyword
    // Phases section ends when we hit a line that is a key:value pair
    if (inPhasesSection) {
      if (line.includes('\t') && !line.includes(':')) {
        // This might be a phase entry: "Name;a;b;c;alpha;beta;gamma;symmetry group"
        const name = line.split(';')[0].split('\t')[0].trim()
        if (name && name !== '0') phases.push(name)
        continue
      } else {
        inPhasesSection = false
      }
    }

    const colonIdx = line.indexOf('\t')
    const semicolonIdx = line.indexOf(';')
    let key = '', val = ''

    if (colonIdx > 0) {
      key = line.slice(0, colonIdx).trim()
      val = line.slice(colonIdx + 1).trim()
    } else if (line.includes(':')) {
      const ci = line.indexOf(':')
      key = line.slice(0, ci).trim()
      val = line.slice(ci + 1).trim()
    }

    switch (key) {
      case 'XCells': xCells = parseInt(val) || 0; break
      case 'YCells': yCells = parseInt(val) || 0; break
      case 'XStep': xStep = parseFloat(val) || 0; break
      case 'YStep': yStep = parseFloat(val) || 0; break
    }
  }

  return { header: { xCells, yCells, xStep, yStep, phases }, dataStartLine }
}

function parseCtfData(lines: string[], startLine: number): { x: number; y: number; phi1: number; PHI: number; phi2: number; phaseIndex: number }[] {
  const result: { x: number; y: number; phi1: number; PHI: number; phi2: number; phaseIndex: number }[] = []
  const limit = Math.min(lines.length - startLine, MAX_DATA_RETURNED)

  // CTF columns: Phase X Y Bands Error Euler1 Euler2 Euler3 MAD BC BS
  //                 0  1 2   3     4     5      6      7     8   9  10
  for (let i = 0; i < limit; i++) {
    const line = lines[startLine + i].trim()
    if (!line) continue
    const parts = line.split(/\s+/)
    if (parts.length < 8) continue

    const phaseIndex = parseInt(parts[0]) || 0
    const x = parseFloat(parts[1])
    const y = parseFloat(parts[2])
    const phi1 = parseFloat(parts[5])
    const PHI = parseFloat(parts[6])
    const phi2 = parseFloat(parts[7])

    if (isFinite(x) && isFinite(y) && isFinite(phi1) && isFinite(PHI) && isFinite(phi2)) {
      result.push({ x, y, phi1, PHI, phi2, phaseIndex })
    }
  }

  return result
}

async function parseCtfBuffer(buffer: Buffer): Promise<ParseResult> {
  const text = buffer.toString('utf-8')
  const { header, dataStartLine } = parseCtfHeader(text)
  const lines = text.split(/\r?\n/)
  const data = parseCtfData(lines, dataStartLine)

  const width = header.xCells || (data.length > 0 ? Math.round(Math.sqrt(data.length)) : 0)
  const height = header.yCells || (width > 0 ? Math.ceil(data.length / width) : 0)

  return {
    parsedJson: {
      kind: 'ebsd_grid',
      format: 'ctf',
      width,
      height,
      phases: header.phases.length > 0 ? header.phases : ['Unknown'],
      stepSize: header.xStep || undefined,
      cols: width || undefined,
      rows: height || undefined,
      data,
    },
    parseStatus: 'ok',
  }
}

// ─── Public entry point ───────────────────────────────────────────────────────

export async function parseEbsd(buffer: Buffer, format: 'ang' | 'ctf'): Promise<ParseResult> {
  try {
    if (format === 'ang') {
      return await parseAngBuffer(buffer)
    } else {
      return await parseCtfBuffer(buffer)
    }
  } catch (e) {
    return {
      parsedJson: {
        kind: 'ebsd_grid',
        format,
        width: 0,
        height: 0,
        phases: [],
      },
      parseStatus: 'failed',
      error: e instanceof Error ? e.message : 'EBSD parse error',
    }
  }
}
