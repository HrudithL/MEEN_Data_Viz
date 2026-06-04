import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { BuildTabNav } from '@/components/builds/BuildTabNav'
import { cn } from '@/lib/utils'
import type { BuildWithPhases } from '@/types/api'

async function getBuild(buildId: string): Promise<BuildWithPhases | null> {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const res = await fetch(`${base}/api/builds/${buildId}`, { cache: 'no-store' })
    if (!res.ok) return null
    const json = await res.json()
    return json.data ?? null
  } catch {
    return null
  }
}


export default async function BuildLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { buildId: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const build = await getBuild(params.buildId)
  if (!build) notFound()

  return (
    <div className="flex flex-col h-full">
      {/* Build header */}
      <div className="px-6 pt-6 pb-0 border-b bg-card">
        <div className="flex items-start justify-between mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Link href="/builds" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Builds
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="text-sm font-medium truncate">{build.name}</span>
            </div>
            <h1 className="text-xl font-bold truncate">{build.name}</h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <Badge
                variant="outline"
                className={cn(
                  'text-xs',
                  build.status === 'complete'
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-blue-200 bg-blue-50 text-blue-700'
                )}
              >
                {build.status === 'complete' ? 'Complete' : 'In Progress'}
              </Badge>
              {build.material && (
                <span className="text-xs text-muted-foreground">Material: {build.material}</span>
              )}
              {build.process && (
                <span className="text-xs text-muted-foreground">Process: {build.process}</span>
              )}
              <span className="text-xs text-muted-foreground">
                {build.completedPhases}/{build.phases?.length ?? 9} phases complete
              </span>
            </div>
          </div>
        </div>

        {/* Tab nav — client component for active highlighting */}
        <BuildTabNav buildId={params.buildId} />
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
