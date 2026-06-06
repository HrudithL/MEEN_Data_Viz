'use client'

import { useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Label,
} from 'recharts'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { PLOT_ALIASES } from '@/lib/constants'
import {
  analyzeColumns,
  suggestCharts,
  aggregateCounts,
  aggregateSum,
  buildHistogramBins,
  buildNumericPairs,
  toNumber,
  type VizType,
  type ColumnProfile,
} from '@/lib/chart-analysis'

const PIE_COLORS = ['#3b82f6', '#f97316', '#22c55e', '#a855f7', '#ef4444', '#06b6d4', '#eab308', '#64748b']

const ALLOWED_VIZ_TYPES: VizType[] = ['line', 'scatter', 'histogram', 'pie', 'bar', 'grouped_bar']

const VIZ_TYPE_OPTIONS: { value: VizType; label: string }[] = [
  { value: 'line', label: 'Line' },
  { value: 'scatter', label: 'Scatter' },
  { value: 'histogram', label: 'Histogram' },
  { value: 'pie', label: 'Pie' },
  { value: 'bar', label: 'Bar' },
  { value: 'grouped_bar', label: 'Grouped bar' },
]

function normalizeVizType(type: VizType): VizType {
  if (ALLOWED_VIZ_TYPES.includes(type)) return type
  return 'line'
}

interface ChartPanelProps {
  rows: Record<string, unknown>[]
  compact?: boolean
}

function findCol(keys: string[], aliases: readonly string[]): string | undefined {
  return keys.find(k => aliases.includes(k.toLowerCase()))
}

function detectPresetHint(rows: Record<string, unknown>[]): string | null {
  if (!rows.length) return null
  const cols = Object.keys(rows[0]).map(c => c.toLowerCase())
  const hasStress = cols.some(c => (PLOT_ALIASES.stress as readonly string[]).includes(c))
  const hasStrain = cols.some(c => (PLOT_ALIASES.strain as readonly string[]).includes(c))
  const hasAmplitude = cols.some(c => (PLOT_ALIASES.stress_amplitude as readonly string[]).includes(c))
  const hasNf = cols.some(c => (PLOT_ALIASES.nf as readonly string[]).includes(c))
  if (hasStress && hasStrain) return 'stress_strain'
  if (hasAmplitude && hasNf) return 'sn_curve'
  return null
}

function RoleSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: ColumnProfile[]
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <Select value={value} onValueChange={v => v && onChange(v)}>
        <SelectTrigger className="h-7 text-xs min-w-[9rem] max-w-full [&_[data-slot=select-value]]:truncate">
          <SelectValue placeholder="Column" />
        </SelectTrigger>
        <SelectContent>
          {options.map(c => (
            <SelectItem key={c.name} value={c.name} className="text-xs">
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function ChartPanel({ rows, compact = false }: ChartPanelProps) {
  const chartHeight = compact ? 160 : 220
  const pieHeight = compact ? 180 : 240
  const profiles = useMemo(() => analyzeColumns(rows), [rows])
  const suggestions = useMemo(() => suggestCharts(profiles), [profiles])
  const presetHint = useMemo(() => detectPresetHint(rows), [rows])

  const numericCols = profiles.filter(p => p.kind === 'numeric' || p.kind === 'datetime')
  const categoricalCols = profiles.filter(p => p.kind === 'categorical')
  const allCols = profiles.filter(p => p.kind !== 'unknown')

  const filteredSuggestions = useMemo(
    () => suggestions.filter(s => ALLOWED_VIZ_TYPES.includes(s.type)),
    [suggestions]
  )

  const [vizType, setVizType] = useState<VizType>(() =>
    normalizeVizType(filteredSuggestions[0]?.type ?? 'line')
  )
  const [roles, setRoles] = useState<Record<string, string>>(() => filteredSuggestions[0]?.roles ?? {})

  function setRole(key: string, value: string) {
    setRoles(prev => ({ ...prev, [key]: value }))
  }

  if (rows.length < 2 || allCols.length === 0) return null

  const xCol = roles.x ?? numericCols[0]?.name ?? allCols[0]?.name ?? ''
  const yCol = roles.y ?? numericCols[1]?.name ?? numericCols[0]?.name ?? ''
  const valueCol = roles.value ?? numericCols[0]?.name ?? ''
  const categoryCol = roles.category ?? categoricalCols[0]?.name ?? ''
  const groupCol = roles.group ?? categoricalCols[1]?.name ?? categoricalCols[0]?.name ?? ''

  return (
    <div className="mt-4 space-y-3 rounded-md border p-3 bg-muted/10">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground shrink-0">Visualization</span>
        <div className="flex flex-wrap gap-1">
          {VIZ_TYPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setVizType(opt.value)}
              className={cn(
                'text-xs px-2 py-0.5 rounded border transition-colors',
                vizType === opt.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-accent border-border'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {vizType === 'histogram' && (
          <RoleSelect label="Value" value={valueCol} options={numericCols} onChange={v => setRole('value', v)} />
        )}
        {(vizType === 'pie' || vizType === 'bar' || vizType === 'grouped_bar') && (
          <RoleSelect label="Category" value={categoryCol} options={categoricalCols.length ? categoricalCols : allCols} onChange={v => setRole('category', v)} />
        )}
        {(vizType === 'bar' || vizType === 'grouped_bar') && numericCols.length > 0 && (
          <RoleSelect label="Value" value={valueCol} options={numericCols} onChange={v => setRole('value', v)} />
        )}
        {(vizType === 'line' || vizType === 'scatter') && (
          <>
            <RoleSelect label="X" value={xCol} options={numericCols.length ? numericCols : allCols} onChange={v => setRole('x', v)} />
            <RoleSelect label="Y" value={yCol} options={numericCols.length ? numericCols : allCols} onChange={v => setRole('y', v)} />
          </>
        )}
        {vizType === 'grouped_bar' && categoricalCols.length >= 2 && (
          <RoleSelect label="Group" value={groupCol} options={categoricalCols} onChange={v => setRole('group', v)} />
        )}
      </div>

      <ChartRenderer
        rows={rows}
        vizType={vizType}
        presetHint={presetHint}
        xCol={xCol}
        yCol={yCol}
        valueCol={valueCol}
        categoryCol={categoryCol}
        groupCol={groupCol}
        chartHeight={chartHeight}
        pieHeight={pieHeight}
      />
    </div>
  )
}

function ChartRenderer({
  rows,
  vizType,
  presetHint,
  xCol,
  yCol,
  valueCol,
  categoryCol,
  groupCol,
  chartHeight,
  pieHeight,
}: {
  rows: Record<string, unknown>[]
  vizType: VizType
  presetHint: string | null
  xCol: string
  yCol: string
  valueCol: string
  categoryCol: string
  groupCol: string
  chartHeight: number
  pieHeight: number
}) {
  if (presetHint === 'stress_strain' && (vizType === 'line' || vizType === 'scatter')) {
    const strainKey = findCol(Object.keys(rows[0] ?? {}), PLOT_ALIASES.strain)!
    const stressKey = findCol(Object.keys(rows[0] ?? {}), PLOT_ALIASES.stress)!
    const data = rows
      .map(r => ({ x: toNumber(r[strainKey]), y: toNumber(r[stressKey]) }))
      .filter(d => !Number.isNaN(d.x) && !Number.isNaN(d.y))

    return (
      <ResponsiveContainer width="100%" height={chartHeight}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="x" type="number" domain={['auto', 'auto']} tick={{ fontSize: 11 }}>
            <Label value="Strain (mm/mm)" offset={-10} position="insideBottom" style={{ fontSize: 11 }} />
          </XAxis>
          <YAxis tick={{ fontSize: 11 }}>
            <Label value="Stress (MPa)" angle={-90} position="insideLeft" style={{ fontSize: 11 }} />
          </YAxis>
          <Tooltip />
          <Line type="monotone" dataKey="y" dot={false} stroke="#3b82f6" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  if (presetHint === 'sn_curve' && vizType === 'scatter') {
    const nfKey = findCol(Object.keys(rows[0] ?? {}), PLOT_ALIASES.nf)!
    const saKey = findCol(Object.keys(rows[0] ?? {}), PLOT_ALIASES.stress_amplitude)!
    const data = rows
      .map(r => ({ x: toNumber(r[nfKey]), y: toNumber(r[saKey]) }))
      .filter(d => !Number.isNaN(d.x) && !Number.isNaN(d.y) && d.x > 0)

    return (
      <ResponsiveContainer width="100%" height={chartHeight}>
        <ScatterChart margin={{ top: 5, right: 20, left: 10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="x" type="number" scale="log" domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
          <YAxis dataKey="y" tick={{ fontSize: 11 }} />
          <Tooltip />
          <Scatter data={data} fill="#f97316" />
        </ScatterChart>
      </ResponsiveContainer>
    )
  }

  if (vizType === 'histogram' && valueCol) {
    const data = buildHistogramBins(rows, valueCol)
    return (
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="bin" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" height={50} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="count" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (vizType === 'pie' && categoryCol) {
    const data = aggregateCounts(rows, categoryCol).slice(0, 12)
    return (
      <ResponsiveContainer width="100%" height={pieHeight}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  if (vizType === 'bar' && categoryCol) {
    const data = valueCol
      ? aggregateSum(rows, categoryCol, valueCol).slice(0, 20)
      : aggregateCounts(rows, categoryCol).slice(0, 20)
    return (
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" height={50} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="value" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (vizType === 'grouped_bar' && categoryCol && valueCol) {
    if (groupCol && groupCol !== categoryCol) {
      const groups = new Set<string>()
      const byCategory = new Map<string, Record<string, number | string>>()

      for (const row of rows) {
        const category = String(row[categoryCol] ?? '(empty)')
        const group = String(row[groupCol] ?? 'Other')
        const value = toNumber(row[valueCol])
        if (Number.isNaN(value)) continue
        groups.add(group)
        if (!byCategory.has(category)) byCategory.set(category, { name: category })
        const entry = byCategory.get(category)!
        entry[group] = (Number(entry[group] ?? 0) + value) as number
      }

      const data = Array.from(byCategory.values()).slice(0, 20)
      const series = Array.from(groups)

      return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {series.map((s, i) => (
              <Bar key={s} dataKey={s} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )
    }

    const data = aggregateSum(rows, categoryCol, valueCol).slice(0, 20)
    return (
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" height={50} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="value" fill="#22c55e" />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (vizType === 'scatter' && xCol && yCol) {
    const data = buildNumericPairs(rows, xCol, yCol)
    return (
      <ResponsiveContainer width="100%" height={chartHeight}>
        <ScatterChart margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="x" type="number" tick={{ fontSize: 11 }} name={xCol} />
          <YAxis dataKey="y" tick={{ fontSize: 11 }} name={yCol} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Scatter data={data} fill="#3b82f6" />
        </ScatterChart>
      </ResponsiveContainer>
    )
  }

  if (xCol && yCol) {
    const data = buildNumericPairs(rows, xCol, yCol)
    return (
      <ResponsiveContainer width="100%" height={chartHeight}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="x" type="number" domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Line type="monotone" dataKey="y" dot={false} stroke="#3b82f6" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  return <p className="text-xs text-muted-foreground">Select columns to build a chart.</p>
}
