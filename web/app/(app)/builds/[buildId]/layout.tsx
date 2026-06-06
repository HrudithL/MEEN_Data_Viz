import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BuildTabNav } from '@/components/builds/BuildTabNav'
import { BuildHeaderStatus } from '@/components/builds/BuildHeaderStatus'
import { getBuildWithPhases } from '@/lib/queries/builds'

export const dynamic = 'force-dynamic'

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

  const build = await getBuildWithPhases(params.buildId)
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
            <BuildHeaderStatus
              buildId={params.buildId}
              initialStatus={build.status}
              initialCompletedPhases={build.completedPhases ?? 0}
              totalPhases={build.phases?.length ?? 9}
              material={build.material}
              process={build.process}
            />
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
