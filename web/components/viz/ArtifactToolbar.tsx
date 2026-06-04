'use client'

import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { ArtifactSummary } from '@/types/api'

type SortKey = 'label' | 'date' | 'type'

interface ArtifactToolbarProps {
  artifacts: ArtifactSummary[]
  activeId: string | null
  search: string
  sortKey: SortKey
  onSearchChange: (v: string) => void
  onSortChange: (k: SortKey) => void
  onTabChange: (id: string) => void
}

export function ArtifactToolbar({
  artifacts,
  activeId,
  search,
  sortKey,
  onSearchChange,
  onSortChange,
  onTabChange,
}: ArtifactToolbarProps) {
  const filtered = artifacts.filter(a =>
    search
      ? a.label.toLowerCase().includes(search.toLowerCase()) ||
        a.fileName.toLowerCase().includes(search.toLowerCase()) ||
        a.fileType.toLowerCase().includes(search.toLowerCase())
      : true
  )

  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === 'label') return a.label.localeCompare(b.label)
    if (sortKey === 'type') return a.fileType.localeCompare(b.fileType)
    if (sortKey === 'date') return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    return 0
  })

  return (
    <div className="space-y-2">
      {/* Search + sort */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Filter artifacts..."
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            className="h-7 pl-8 text-sm"
          />
        </div>
        <Select value={sortKey} onValueChange={v => v && onSortChange(v as SortKey)}>
          <SelectTrigger className="h-7 w-[110px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="label">By Label</SelectItem>
            <SelectItem value="date">By Date</SelectItem>
            <SelectItem value="type">By Type</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tab row */}
      {sorted.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {sorted.map(artifact => (
            <button
              key={artifact.id}
              type="button"
              onClick={() => onTabChange(artifact.id)}
              className={cn(
                'px-2.5 py-1 rounded text-xs font-medium transition-colors border',
                activeId === artifact.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:bg-accent hover:text-foreground'
              )}
            >
              {artifact.label}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 && search && (
        <p className="text-xs text-muted-foreground">No artifacts match "{search}"</p>
      )}
    </div>
  )
}
