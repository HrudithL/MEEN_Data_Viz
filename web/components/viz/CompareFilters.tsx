'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CompareFiltersProps {
  distinctLabels: string[]
  metadataOptions: {
    shieldGas: string[]
    heatTreatment: string[]
    processParameters: string[]
  }
  onApply: (filters: CompareFilterValues) => void
}

export interface CompareFilterValues {
  label: string
  shieldGas: string
  heatTreatment: string
  processParameters: string
}

const ALL = '__all__'

export function CompareFilters({ metadataOptions, onApply }: CompareFiltersProps) {
  const hasFilters =
    metadataOptions.shieldGas.length > 0 ||
    metadataOptions.heatTreatment.length > 0 ||
    metadataOptions.processParameters.length > 0

  const [shieldGas, setShieldGas] = useState(ALL)
  const [heatTreatment, setHeatTreatment] = useState(ALL)
  const [processParameters, setProcessParameters] = useState(ALL)

  if (!hasFilters) return null

  function apply(next: Partial<{ shieldGas: string; heatTreatment: string; processParameters: string }>) {
    const sg = next.shieldGas ?? shieldGas
    const ht = next.heatTreatment ?? heatTreatment
    const pp = next.processParameters ?? processParameters
    setShieldGas(sg)
    setHeatTreatment(ht)
    setProcessParameters(pp)
    onApply({
      label: '',
      shieldGas: sg === ALL ? '' : sg,
      heatTreatment: ht === ALL ? '' : ht,
      processParameters: pp === ALL ? '' : pp,
    })
  }

  return (
    <div className="flex flex-wrap items-end gap-4 p-4 border rounded-lg bg-muted/20">
      {metadataOptions.shieldGas.length > 0 && (
        <div className="space-y-1.5 min-w-[140px]">
          <Label className="text-xs">Shield Gas</Label>
          <Select value={shieldGas} onValueChange={v => apply({ shieldGas: v ?? ALL })}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="All Shield Gases" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Shield Gases</SelectItem>
              {metadataOptions.shieldGas.map(v => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {metadataOptions.heatTreatment.length > 0 && (
        <div className="space-y-1.5 min-w-[150px]">
          <Label className="text-xs">Heat Treatment</Label>
          <Select value={heatTreatment} onValueChange={v => apply({ heatTreatment: v ?? ALL })}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="All Heat Treatments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Heat Treatments</SelectItem>
              {metadataOptions.heatTreatment.map(v => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {metadataOptions.processParameters.length > 0 && (
        <div className="space-y-1.5 min-w-[160px]">
          <Label className="text-xs">Process Params</Label>
          <Select value={processParameters} onValueChange={v => apply({ processParameters: v ?? ALL })}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="All Process Params" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Process Params</SelectItem>
              {metadataOptions.processParameters.map(v => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}
