'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
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

export function CompareFilters({ distinctLabels, metadataOptions, onApply }: CompareFiltersProps) {
  const [label, setLabel] = useState(ALL)
  const [shieldGas, setShieldGas] = useState(ALL)
  const [heatTreatment, setHeatTreatment] = useState(ALL)
  const [processParameters, setProcessParameters] = useState(ALL)

  function handleApply() {
    onApply({
      label: label === ALL ? '' : label,
      shieldGas: shieldGas === ALL ? '' : shieldGas,
      heatTreatment: heatTreatment === ALL ? '' : heatTreatment,
      processParameters: processParameters === ALL ? '' : processParameters,
    })
  }

  return (
    <div className="flex flex-wrap items-end gap-4 p-4 border rounded-lg bg-muted/20">
      <div className="space-y-1.5 min-w-[150px]">
        <Label className="text-xs">Label</Label>
        <Select value={label} onValueChange={v => setLabel(v ?? ALL)}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="All labels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All labels</SelectItem>
            {distinctLabels.map(l => (
              <SelectItem key={l} value={l}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {metadataOptions.shieldGas.length > 0 && (
        <div className="space-y-1.5 min-w-[140px]">
          <Label className="text-xs">Shield Gas</Label>
          <Select value={shieldGas} onValueChange={v => setShieldGas(v ?? ALL)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All</SelectItem>
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
          <Select value={heatTreatment} onValueChange={v => setHeatTreatment(v ?? ALL)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All</SelectItem>
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
          <Select value={processParameters} onValueChange={v => setProcessParameters(v ?? ALL)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All</SelectItem>
              {metadataOptions.processParameters.map(v => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Button onClick={handleApply} size="sm" className="h-8">
        Apply
      </Button>
    </div>
  )
}
