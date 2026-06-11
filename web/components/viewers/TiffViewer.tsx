'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { ParsedJson } from '@/types/database'
import { Loader2 } from 'lucide-react'

interface TiffViewerProps {
    parsedJson: Extract<ParsedJson, { kind: 'slice_stack' }>
    buildId: string
    density?: 'full' | 'compact'
}

interface SliceCache {
    [index: number]: string // signed URL
}

async function fetchSliceUrl(storagePath: string): Promise<string> {
    if (!storagePath) return ''
    const res = await fetch(`/api/storage/sign-download?storagePath=${encodeURIComponent(storagePath)}`)
    if (!res.ok) return ''
    const data = await res.json() as { data?: { signedUrl?: string } }
    return data.data?.signedUrl ?? ''
}

export function TiffViewer({ parsedJson, buildId, density = 'full' }: TiffViewerProps) {
    const { sliceCount, slices } = parsedJson
    const [currentIndex, setCurrentIndex] = useState(0)
    const [urlCache, setUrlCache] = useState<SliceCache>({})
    const [loadingSlice, setLoadingSlice] = useState(false)
    const pendingFetches = useRef<Set<number>>(new Set())

    const height = density === 'compact' ? 240 : 480

    // Load a slice URL and cache it
    const loadSlice = useCallback(async (index: number) => {
        if (urlCache[index] !== undefined || pendingFetches.current.has(index)) return
        const slice = slices[index]
        if (!slice || !slice.storagePath) return

        pendingFetches.current.add(index)
        const url = await fetchSliceUrl(slice.storagePath)
        pendingFetches.current.delete(index)
        if (url) {
            setUrlCache(prev => ({ ...prev, [index]: url }))
        }
    }, [urlCache, slices])

    // Preload current ±2 slices
    useEffect(() => {
        const toLoad = [
            currentIndex,
            currentIndex - 1,
            currentIndex - 2,
            currentIndex + 1,
            currentIndex + 2,
        ].filter(i => i >= 0 && i < sliceCount)

        for (const idx of toLoad) {
            loadSlice(idx)
        }
    }, [currentIndex, sliceCount, loadSlice])

    const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentIndex(parseInt(e.target.value))
    }, [])

    const currentUrl = urlCache[currentIndex]
    const isLoading = !currentUrl && slices[currentIndex]?.storagePath

    if (sliceCount === 0) {
        return (
            <div className="rounded-md border bg-zinc-950 flex items-center justify-center" style={{ height }}>
                <p className="text-xs text-muted-foreground">No slices available</p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {/* Image display */}
            <div
                className="relative rounded-md border overflow-hidden bg-zinc-950 flex items-center justify-center"
                style={{ height }}
            >
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                )}

                {currentUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={currentUrl}
                        alt={`Slice ${currentIndex + 1}`}
                        style={{
                            maxWidth: '100%',
                            maxHeight: height - 4,
                            objectFit: 'contain',
                        }}
                    />
                )}

                {!currentUrl && !isLoading && (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <p className="text-xs">Slice preview unavailable</p>
                        <p className="text-xs opacity-60">Storage path not yet assigned</p>
                    </div>
                )}

                {/* Slice number overlay */}
                <div className="absolute bottom-2 right-2">
                    <span className="text-xs text-zinc-300 bg-zinc-900/80 px-2 py-0.5 rounded font-mono">
                        {currentIndex + 1} / {sliceCount}
                    </span>
                </div>
            </div>

            {/* Slider */}
            {sliceCount > 1 && (
                <div className="space-y-1">
                    <input
                        type="range"
                        min={0}
                        max={sliceCount - 1}
                        value={currentIndex}
                        onChange={handleSliderChange}
                        className="w-full h-1.5 accent-blue-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Slice 1</span>
                        <span>Slice {sliceCount}</span>
                    </div>
                </div>
            )}

            {density === 'full' && (
                <p className="text-xs text-muted-foreground">
                    {sliceCount} TIFF slices · Use slider to navigate
                </p>
            )}
        </div>
    )
}
