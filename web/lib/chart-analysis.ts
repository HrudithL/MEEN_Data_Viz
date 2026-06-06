export type ColumnKind = 'numeric' | 'categorical' | 'datetime' | 'unknown'

export type VizType =
  | 'line'
  | 'scatter'
  | 'bar'
  | 'histogram'
  | 'pie'
  | 'grouped_bar'
  | 'multi_line'

export interface ColumnProfile {
  name: string
  kind: ColumnKind
  uniqueCount: number
  numericRatio: number
}

export interface ChartSuggestion {
  type: VizType
  label: string
  roles: Record<string, string>
}

function toNumber(v: unknown): number {
  if (v === null || v === undefined) return NaN
  const n = Number(String(v).replace(/,/g, ''))
  return Number.isFinite(n) ? n : NaN
}

function isDateLike(v: unknown): boolean {
  if (typeof v !== 'string') return false
  const d = Date.parse(v)
  return !Number.isNaN(d) && /\d{4}|\d{1,2}[/-]\d{1,2}/.test(v)
}

export function analyzeColumns(rows: Record<string, unknown>[]): ColumnProfile[] {
  if (!rows.length || !rows[0]) return []

  return Object.keys(rows[0]).map(name => {
    const sample = rows.slice(0, Math.min(200, rows.length)).map(r => r[name])
    const nonEmpty = sample.filter(v => v !== null && v !== undefined && String(v).trim() !== '')
    if (nonEmpty.length === 0) {
      return { name, kind: 'unknown' as ColumnKind, uniqueCount: 0, numericRatio: 0 }
    }

    const numericCount = nonEmpty.filter(v => !Number.isNaN(toNumber(v))).length
    const dateCount = nonEmpty.filter(v => isDateLike(v)).length
    const numericRatio = numericCount / nonEmpty.length
    const unique = new Set(nonEmpty.map(v => String(v))).size

    let kind: ColumnKind = 'unknown'
    if (dateCount / nonEmpty.length > 0.7) kind = 'datetime'
    else if (numericRatio > 0.85) kind = 'numeric'
    else if (unique <= Math.max(20, Math.ceil(rows.length * 0.5))) kind = 'categorical'
    else kind = 'categorical'

    return { name, kind, uniqueCount: unique, numericRatio }
  })
}

export function suggestCharts(profiles: ColumnProfile[]): ChartSuggestion[] {
  const numeric = profiles.filter(p => p.kind === 'numeric')
  const categorical = profiles.filter(p => p.kind === 'categorical')
  const datetime = profiles.filter(p => p.kind === 'datetime')
  const suggestions: ChartSuggestion[] = []

  if (numeric.length >= 1) {
    suggestions.push({
      type: 'histogram',
      label: 'Histogram',
      roles: { value: numeric[0].name },
    })
  }

  if (categorical.length >= 1) {
    suggestions.push({
      type: 'pie',
      label: 'Pie chart (counts)',
      roles: { category: categorical[0].name },
    })
    if (numeric.length >= 1) {
      suggestions.push({
        type: 'bar',
        label: 'Bar chart',
        roles: { category: categorical[0].name, value: numeric[0].name },
      })
    } else {
      suggestions.push({
        type: 'bar',
        label: 'Bar chart (counts)',
        roles: { category: categorical[0].name },
      })
    }
  }

  if (numeric.length >= 2) {
    suggestions.push({
      type: 'scatter',
      label: 'Scatter plot',
      roles: { x: numeric[0].name, y: numeric[1].name },
    })
    suggestions.push({
      type: 'line',
      label: 'Line plot',
      roles: { x: numeric[0].name, y: numeric[1].name },
    })
  }

  if (datetime.length >= 1 && numeric.length >= 1) {
    suggestions.push({
      type: 'line',
      label: 'Time series',
      roles: { x: datetime[0].name, y: numeric[0].name },
    })
  }

  if (categorical.length >= 1 && numeric.length >= 1) {
    suggestions.push({
      type: 'grouped_bar',
      label: 'Grouped bar',
      roles: { category: categorical[0].name, value: numeric[0].name },
    })
  }

  const seen = new Set<string>()
  return suggestions.filter(s => {
    const key = `${s.type}-${JSON.stringify(s.roles)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function aggregateCounts(
  rows: Record<string, unknown>[],
  categoryCol: string
): { name: string; value: number }[] {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const key = String(row[categoryCol] ?? '(empty)')
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

export function aggregateSum(
  rows: Record<string, unknown>[],
  categoryCol: string,
  valueCol: string
): { name: string; value: number }[] {
  const sums = new Map<string, number>()
  for (const row of rows) {
    const key = String(row[categoryCol] ?? '(empty)')
    const v = toNumber(row[valueCol])
    if (!Number.isNaN(v)) sums.set(key, (sums.get(key) ?? 0) + v)
  }
  return Array.from(sums.entries()).map(([name, value]) => ({ name, value }))
}

export function buildHistogramBins(
  rows: Record<string, unknown>[],
  valueCol: string,
  binCount = 12
): { bin: string; count: number; mid: number }[] {
  const values = rows.map(r => toNumber(r[valueCol])).filter(v => !Number.isNaN(v))
  if (values.length === 0) return []

  const min = Math.min(...values)
  const max = Math.max(...values)
  if (min === max) {
    return [{ bin: String(min), count: values.length, mid: min }]
  }

  const step = (max - min) / binCount
  const bins = Array.from({ length: binCount }, (_, i) => ({
    bin: `${(min + i * step).toFixed(2)}–${(min + (i + 1) * step).toFixed(2)}`,
    count: 0,
    mid: min + (i + 0.5) * step,
  }))

  for (const v of values) {
    let idx = Math.floor((v - min) / step)
    if (idx >= binCount) idx = binCount - 1
    if (idx < 0) idx = 0
    bins[idx].count++
  }

  return bins
}

export function buildNumericPairs(
  rows: Record<string, unknown>[],
  xCol: string,
  yCol: string
): { x: number; y: number; group?: string }[] {
  return rows
    .map(r => ({
      x: toNumber(r[xCol]),
      y: toNumber(r[yCol]),
    }))
    .filter(p => !Number.isNaN(p.x) && !Number.isNaN(p.y))
}

export function buildMultiSeries(
  rows: Record<string, unknown>[],
  xCol: string,
  yCol: string,
  groupCol: string
): { data: Record<string, number | string>[]; series: string[] } {
  const groups = new Set<string>()
  const byX = new Map<string, Record<string, number | string>>()

  for (const row of rows) {
    const x = toNumber(row[xCol])
    const y = toNumber(row[yCol])
    const g = String(row[groupCol] ?? 'Other')
    if (Number.isNaN(x) || Number.isNaN(y)) continue
    groups.add(g)
    const key = String(x)
    if (!byX.has(key)) byX.set(key, { x })
    byX.get(key)![g] = y
  }

  const series = Array.from(groups)
  const data = Array.from(byX.values()).sort(
    (a, b) => Number(a.x) - Number(b.x)
  )
  return { data, series }
}

export { toNumber }
