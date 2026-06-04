'use client'

import { useEffect, useRef, useMemo } from 'react'
import type { ParsedJson } from '@/types/database'

interface EbsdViewerProps {
  parsedJson: Extract<ParsedJson, { kind: 'ebsd_grid' }>
  density?: 'full' | 'compact'
}

// Convert Euler angles (phi1, PHI, phi2) to a simplified IPF-style RGB color.
// This is NOT crystallographically exact — it maps Euler space to HSL for visualization.
function eulerToRgb(phi1: number, PHI: number, phi2: number): [number, number, number] {
  // phi1 ∈ [0, 2π], PHI ∈ [0, π], phi2 ∈ [0, 2π]
  // Normalize to [0, 1]
  const h = (phi1 / (2 * Math.PI)) % 1
  const s = Math.sin(PHI / 2) // PHI/2 maps [0, π] → [0, π/2] → sin gives [0, 1]
  const l = 0.35 + 0.35 * Math.cos(phi2) // [0, 0.7] range

  // HSL to RGB
  return hslToRgb(h, s, l)
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0

  const hi = Math.floor(h * 6) % 6
  switch (hi) {
    case 0: r = c; g = x; b = 0; break
    case 1: r = x; g = c; b = 0; break
    case 2: r = 0; g = c; b = x; break
    case 3: r = 0; g = x; b = c; break
    case 4: r = x; g = 0; b = c; break
    case 5: r = c; g = 0; b = x; break
  }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ]
}

// Distinct colors for phases (up to 10)
const PHASE_COLORS = [
  '#ef4444', '#3b82f6', '#22c55e', '#f59e0b',
  '#a855f7', '#ec4899', '#06b6d4', '#84cc16',
  '#f97316', '#64748b',
]

export function EbsdViewer({ parsedJson, density = 'full' }: EbsdViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const {
    width,
    height: gridHeight,
    phases,
    data,
    cols,
    rows: gridRows,
  } = parsedJson

  const displayCols = cols ?? width
  const displayRows = gridRows ?? gridHeight

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !data || data.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Determine grid dimensions
    const numCols = displayCols > 0 ? displayCols : Math.ceil(Math.sqrt(data.length))
    const numRows = displayRows > 0 ? displayRows : Math.ceil(data.length / numCols)

    // Set canvas size
    const maxPx = density === 'compact' ? 200 : 480
    const pixelSize = Math.max(1, Math.floor(Math.min(maxPx / numCols, maxPx / numRows)))
    const canvasW = Math.min(numCols * pixelSize, maxPx)
    const canvasH = Math.min(numRows * pixelSize, maxPx)

    canvas.width = canvasW
    canvas.height = canvasH

    // Create image data
    const imageData = ctx.createImageData(canvasW, canvasH)
    const imgArr = imageData.data

    // Fill background
    imgArr.fill(255)

    // Map points to pixel grid
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity

    for (const pt of data) {
      if (pt.x < minX) minX = pt.x
      if (pt.x > maxX) maxX = pt.x
      if (pt.y < minY) minY = pt.y
      if (pt.y > maxY) maxY = pt.y
    }

    const xRange = maxX - minX || 1
    const yRange = maxY - minY || 1

    for (const pt of data) {
      const [r, g, b] = eulerToRgb(pt.phi1, pt.PHI, pt.phi2)
      const px = Math.floor(((pt.x - minX) / xRange) * (canvasW - 1))
      const py = Math.floor(((pt.y - minY) / yRange) * (canvasH - 1))

      const idx = (py * canvasW + px) * 4
      if (idx >= 0 && idx + 3 < imgArr.length) {
        imgArr[idx] = r
        imgArr[idx + 1] = g
        imgArr[idx + 2] = b
        imgArr[idx + 3] = 255
      }
    }

    ctx.putImageData(imageData, 0, 0)
  }, [data, displayCols, displayRows, density])

  const canvasHeight = density === 'compact' ? 200 : 480

  return (
    <div className="space-y-3">
      {/* Info row */}
      <div className="flex gap-3 text-xs text-muted-foreground">
        <span>{displayCols} × {displayRows} grid</span>
        {parsedJson.stepSize && <span>Step: {parsedJson.stepSize.toFixed(3)} μm</span>}
        <span>{data?.length?.toLocaleString() ?? 0} points</span>
        <span className="capitalize">.{parsedJson.format}</span>
      </div>

      {/* Canvas */}
      <div className="rounded-md border overflow-hidden bg-zinc-950 flex items-center justify-center" style={{ minHeight: canvasHeight }}>
        {(!data || data.length === 0) ? (
          <p className="text-xs text-muted-foreground">No orientation data available for preview</p>
        ) : (
          <canvas
            ref={canvasRef}
            style={{ imageRendering: 'pixelated', maxWidth: '100%', maxHeight: canvasHeight }}
          />
        )}
      </div>

      {/* Phase legend */}
      {density === 'full' && phases.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {phases.map((phase, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              <div
                className="h-3 w-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: PHASE_COLORS[i % PHASE_COLORS.length] }}
              />
              <span className="text-muted-foreground">{phase}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
