import type { ParseResult } from './index'
import type { ColumnDictionary } from '@/types/database'

function detectType(values: unknown[]): string {
  const nonEmpty = values.filter(v => v !== null && v !== undefined && v !== '')
  if (nonEmpty.length === 0) return 'string'

  const numCount = nonEmpty.filter(v => !isNaN(Number(v)) && String(v).trim() !== '').length
  if (numCount / nonEmpty.length >= 0.8) return 'number'

  const dateRe = /^\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}/
  const dateCount = nonEmpty.filter(v => dateRe.test(String(v))).length
  if (dateCount / nonEmpty.length >= 0.8) return 'date'

  return 'string'
}

function buildColumnDictionary(rows: Record<string, unknown>[]): ColumnDictionary {
  if (rows.length === 0) return {}
  const cols = Object.keys(rows[0])
  const sample = rows.slice(0, 10)
  const dict: ColumnDictionary = {}
  for (const col of cols) {
    const values = sample.map(r => r[col])
    dict[col] = { type: detectType(values), displayName: col }
  }
  return dict
}

function splitIntoTables(text: string): string[][] {
  const lines = text.split(/\r?\n/)
  const tables: string[][] = []
  let current: string[] = []

  for (const line of lines) {
    if (line.trim() === '') {
      if (current.length > 0) {
        tables.push(current)
        current = []
      }
    } else {
      current.push(line)
    }
  }
  if (current.length > 0) tables.push(current)
  return tables.length > 0 ? tables : [lines.filter(l => l.trim() !== '')]
}

export async function parseCsv(buffer: Buffer): Promise<ParseResult> {
  try {
    const Papa = (await import('papaparse')).default

    const text = buffer.toString('utf-8')
    const rawTables = splitIntoTables(text)

    // If only one block, treat as single table (no multi-table splitting)
    const isSingleTable = rawTables.length <= 1 || text.split(/\n\s*\n/).filter(s => s.trim()).length <= 1
    const blocks = isSingleTable ? [text] : rawTables.map(lines => lines.join('\n'))

    const tables: { name?: string; rows: Record<string, unknown>[] }[] = []
    let hadErrors = false

    for (let i = 0; i < blocks.length; i++) {
      const result = Papa.parse<Record<string, unknown>>(blocks[i], {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        transformHeader: (h: string) => h.trim(),
      })

      if (result.errors && result.errors.length > 0) hadErrors = true

      const rows = (result.data as Record<string, unknown>[]).filter(
        r => Object.values(r).some(v => v !== null && v !== undefined && String(v).trim() !== '')
      )

      if (rows.length > 0) {
        tables.push({
          name: blocks.length > 1 ? `Table ${i + 1}` : undefined,
          rows,
        })
      }
    }

    if (tables.length === 0) {
      return {
        parsedJson: { kind: 'table', tables: [] },
        parseStatus: 'failed',
        error: 'No data rows found',
      }
    }

    const columnDictionary = buildColumnDictionary(tables[0].rows)

    return {
      parsedJson: { kind: 'table', tables },
      columnDictionary,
      parseStatus: hadErrors ? 'partial' : 'ok',
    }
  } catch (e) {
    return {
      parsedJson: { kind: 'table', tables: [] },
      parseStatus: 'failed',
      error: e instanceof Error ? e.message : 'CSV parse error',
    }
  }
}
