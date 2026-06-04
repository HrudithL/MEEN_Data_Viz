'use client'

import { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label,
} from 'recharts'
import type { ParsedJson, ColumnDictionary } from '@/types/database'
import type { ArtifactSummary } from './ViewerRegistry'
import { PLOT_ALIASES } from '@/lib/constants'

interface CsvViewerProps {
  parsedJson: Extract<ParsedJson, { kind: 'table' }>
  artifact: ArtifactSummary & { columnDictionary?: ColumnDictionary | null }
  density?: 'full' | 'compact'
}

function detectViewerHint(rows: Record<string, unknown>[]): string | null {
  if (!rows || rows.length === 0) return null
  const cols = Object.keys(rows[0]).map(c => c.toLowerCase())
  const hasStress = cols.some(c => (PLOT_ALIASES.stress as readonly string[]).includes(c))
  const hasStrain = cols.some(c => (PLOT_ALIASES.strain as readonly string[]).includes(c))
  const hasAmplitude = cols.some(c => (PLOT_ALIASES.stress_amplitude as readonly string[]).includes(c))
  const hasNf = cols.some(c => (PLOT_ALIASES.nf as readonly string[]).includes(c))
  if (hasStress && hasStrain) return 'stress_strain'
  if (hasAmplitude && hasNf) return 'sn_curve'
  return null
}

function findCol(keys: string[], aliases: readonly string[]): string | undefined {
  return keys.find(k => aliases.includes(k.toLowerCase()))
}

function toNumber(v: unknown): number {
  const n = Number(v)
  return isFinite(n) ? n : NaN
}

interface ChartProps {
  rows: Record<string, unknown>[]
  hint: string | null
  colX: string
  colY: string
  onChangeX: (v: string) => void
  onChangeY: (v: string) => void
  columns: string[]
}

function DataChart({ rows, hint, colX, colY, onChangeX, onChangeY, columns }: ChartProps) {
  if (hint === 'stress_strain') {
    const strainKey = findCol(Object.keys(rows[0] ?? {}), PLOT_ALIASES.strain)!
    const stressKey = findCol(Object.keys(rows[0] ?? {}), PLOT_ALIASES.stress)!
    const data = rows
      .map(r => ({ x: toNumber(r[strainKey]), y: toNumber(r[stressKey]) }))
      .filter(d => !isNaN(d.x) && !isNaN(d.y))

    return (
      <div className="mt-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">Stress–Strain</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="x" type="number" domain={['auto', 'auto']} tick={{ fontSize: 11 }}>
              <Label value="Strain (mm/mm)" offset={-10} position="insideBottom" style={{ fontSize: 11 }} />
            </XAxis>
            <YAxis tick={{ fontSize: 11 }}>
              <Label value="Stress (MPa)" angle={-90} position="insideLeft" style={{ fontSize: 11 }} />
            </YAxis>
            <Tooltip formatter={(v: unknown) => (typeof v === 'number' ? v.toFixed(3) : String(v))} />
            <Line type="monotone" dataKey="y" dot={false} stroke="#3b82f6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (hint === 'sn_curve') {
    const nfKey = findCol(Object.keys(rows[0] ?? {}), PLOT_ALIASES.nf)!
    const saKey = findCol(Object.keys(rows[0] ?? {}), PLOT_ALIASES.stress_amplitude)!
    const data = rows
      .map(r => ({ x: toNumber(r[nfKey]), y: toNumber(r[saKey]) }))
      .filter(d => !isNaN(d.x) && !isNaN(d.y) && d.x > 0)

    return (
      <div className="mt-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">S-N Curve (log-log)</p>
        <ResponsiveContainer width="100%" height={220}>
          <ScatterChart margin={{ top: 5, right: 20, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="x"
              type="number"
              scale="log"
              domain={['auto', 'auto']}
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => v.toExponential(0)}
            >
              <Label value="Cycles to Failure (Nf)" offset={-10} position="insideBottom" style={{ fontSize: 11 }} />
            </XAxis>
            <YAxis dataKey="y" tick={{ fontSize: 11 }}>
              <Label value="Stress Amplitude (MPa)" angle={-90} position="insideLeft" style={{ fontSize: 11 }} />
            </YAxis>
            <Tooltip formatter={(v: unknown) => (typeof v === 'number' ? v.toFixed(2) : String(v))} />
            <Scatter data={data} fill="#f97316" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // Generic XY chart
  const numericCols = columns.filter(col => {
    const sample = rows.slice(0, 5).map(r => r[col])
    return sample.some(v => !isNaN(Number(v)) && String(v).trim() !== '')
  })

  if (numericCols.length < 2) return null

  const data = rows
    .map(r => ({ x: toNumber(r[colX]), y: toNumber(r[colY]) }))
    .filter(d => !isNaN(d.x) && !isNaN(d.y))

  return (
    <div className="mt-4">
      <div className="flex gap-2 mb-2 items-center">
        <span className="text-xs text-muted-foreground">X:</span>
        <Select value={colX} onValueChange={(v) => v && onChangeX(v)}>
          <SelectTrigger className="h-7 text-xs w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {numericCols.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">Y:</span>
        <Select value={colY} onValueChange={(v) => v && onChangeY(v)}>
          <SelectTrigger className="h-7 text-xs w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {numericCols.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="x" type="number" domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Line type="monotone" dataKey="y" dot={false} stroke="#3b82f6" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CsvViewer({ parsedJson, artifact, density = 'full' }: CsvViewerProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [tableIdx, setTableIdx] = useState(0)
  const [colX, setColX] = useState('')
  const [colY, setColY] = useState('')

  const tables = parsedJson.tables
  const activeTable = tables[tableIdx] ?? tables[0]
  const rows = activeTable?.rows ?? []

  const pageSize = density === 'compact' ? 20 : 50

  const hint = useMemo(() => detectViewerHint(rows), [rows])

  const colDefs = useMemo<ColumnDef<Record<string, unknown>>[]>(() => {
    if (!rows[0]) return []
    return Object.keys(rows[0]).map(key => {
      const displayName =
        (artifact as { columnDictionary?: ColumnDictionary | null }).columnDictionary?.[key]?.displayName ?? key
      return {
        id: key,
        accessorKey: key,
        header: displayName,
        cell: ({ getValue }) => {
          const v = getValue()
          if (v === null || v === undefined) return <span className="text-muted-foreground">—</span>
          return String(v)
        },
      }
    })
  }, [rows, artifact])

  const columns = useMemo(() => (rows[0] ? Object.keys(rows[0]) : []), [rows])

  // Initialize generic chart axes
  useMemo(() => {
    if (!colX && columns.length >= 2) setColX(columns[0])
    if (!colY && columns.length >= 2) setColY(columns[1])
  }, [columns, colX, colY])

  const table = useReactTable({
    data: rows,
    columns: colDefs,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  })

  return (
    <div className="space-y-3">
      {tables.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {tables.map((t, i) => (
            <Badge
              key={i}
              variant={i === tableIdx ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setTableIdx(i)}
            >
              {t.name ?? `Table ${i + 1}`}
            </Badge>
          ))}
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        {rows.length.toLocaleString()} rows · {columns.length} columns
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id}>
                {hg.headers.map(header => (
                  <TableHead
                    key={header.id}
                    className="whitespace-nowrap text-xs cursor-pointer select-none"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <span className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' && <ChevronUp className="h-3 w-3" />}
                      {header.column.getIsSorted() === 'desc' && <ChevronDown className="h-3 w-3" />}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map(row => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <TableCell key={cell.id} className="text-xs whitespace-nowrap py-1.5">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Chart */}
      {density === 'full' && rows.length > 1 && (
        <DataChart
          rows={rows}
          hint={hint}
          colX={colX}
          colY={colY}
          onChangeX={setColX}
          onChangeY={setColY}
          columns={columns}
        />
      )}
    </div>
  )
}
