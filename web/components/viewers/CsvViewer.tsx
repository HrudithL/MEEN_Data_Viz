'use client'

import { useState, useMemo, useEffect } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ParsedJson, ColumnDictionary } from '@/types/database'
import type { ArtifactSummary } from './ViewerRegistry'
import { ChartPanel } from './ChartPanel'

interface CsvViewerProps {
  parsedJson: Extract<ParsedJson, { kind: 'table' }>
  artifact: ArtifactSummary & { columnDictionary?: ColumnDictionary | null }
  density?: 'full' | 'compact'
  compareMode?: boolean
}

const DEFAULT_PREVIEW_ROWS = 5

export function CsvViewer({ parsedJson, artifact, density = 'full', compareMode = false }: CsvViewerProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [tableIdx, setTableIdx] = useState(0)
  const [tableExpanded, setTableExpanded] = useState(false)
  const [compareView, setCompareView] = useState<'table' | 'chart'>('chart')

  const tables = parsedJson.tables
  const activeTable = tables[tableIdx] ?? tables[0]
  const rows = activeTable?.rows ?? []

  const previewMode = !tableExpanded
  const pageSize = previewMode ? DEFAULT_PREVIEW_ROWS : density === 'compact' ? 20 : 50

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

  useEffect(() => {
    table.setPageSize(pageSize)
    table.setPageIndex(0)
  }, [pageSize, table])

  const columns = rows[0] ? Object.keys(rows[0]) : []

  return (
    <div className="space-y-3">
      {compareMode && (
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant={compareView === 'table' ? 'default' : 'outline'}
            className="h-7 text-xs"
            onClick={() => setCompareView('table')}
          >
            Table
          </Button>
          <Button
            type="button"
            size="sm"
            variant={compareView === 'chart' ? 'default' : 'outline'}
            className="h-7 text-xs"
            onClick={() => setCompareView('chart')}
          >
            Charts
          </Button>
        </div>
      )}

      {(!compareMode || compareView === 'table') && (
        <>
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

      {!previewMode && (
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
      )}

      {previewMode && rows.length > DEFAULT_PREVIEW_ROWS && density === 'full' && (
        <button
          type="button"
          onClick={() => setTableExpanded(true)}
          className="w-full text-xs text-muted-foreground text-center hover:text-foreground hover:underline transition-colors py-1"
        >
          Showing first {DEFAULT_PREVIEW_ROWS} rows — expand to browse full table
        </button>
      )}

      {previewMode && rows.length > DEFAULT_PREVIEW_ROWS && density === 'compact' && (
        <p className="text-xs text-muted-foreground text-center">
          Showing first {DEFAULT_PREVIEW_ROWS} rows
        </p>
      )}

      {!previewMode && density === 'full' && (
        <button
          type="button"
          onClick={() => setTableExpanded(false)}
          className="w-full text-xs text-muted-foreground text-center hover:text-foreground hover:underline transition-colors py-1"
        >
          Collapse to preview ({DEFAULT_PREVIEW_ROWS} rows)
        </button>
      )}
        </>
      )}

      {(!compareMode || compareView === 'chart') && rows.length > 1 && (
        <ChartPanel rows={rows} compact={density === 'compact' || compareMode} />
      )}
    </div>
  )
}
