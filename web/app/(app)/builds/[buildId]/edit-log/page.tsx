'use client'

import { useParams } from 'next/navigation'
import { EditLogPanel } from '@/components/builds/EditLogPanel'

export default function EditLogPage() {
  const params = useParams()
  const buildId = params?.buildId as string

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Edit Log</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Track file changes and edits across this build
        </p>
      </div>
      <EditLogPanel buildId={buildId} />
    </div>
  )
}
