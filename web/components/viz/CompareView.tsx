'use client'

import { useParams } from 'next/navigation'
import { PhaseCompareSelector } from './PhaseCompareSelector'

export function CompareView() {
  const params = useParams()
  const buildId = params?.buildId as string

  return <PhaseCompareSelector buildId={buildId} />
}
