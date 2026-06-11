'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface BuildTabNavProps {
  buildId: string
}

const TABS = [
  { label: 'Overview', suffix: '' },
  { label: 'Data', suffix: '/data' },
  { label: 'Visualizations', suffix: '/visualizations' },
  { label: 'Edit Log', suffix: '/edit-log' },
  { label: 'Settings', suffix: '/settings' },
]

export function BuildTabNav({ buildId }: BuildTabNavProps) {
  const pathname = usePathname()
  const base = `/builds/${buildId}`

  function isActive(suffix: string) {
    if (suffix === '') {
      return pathname === base || pathname === `${base}/`
    }
    return pathname.startsWith(`${base}${suffix}`)
  }

  return (
    <nav className="flex gap-0">
      {TABS.map(tab => {
        const href = `${base}${tab.suffix}`
        const active = isActive(tab.suffix)
        return (
          <Link
            key={tab.suffix}
            href={href}
            data-nav-label={`Loading ${tab.label.toLowerCase()}…`}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-all duration-200 ease-snappy -mb-px interactive active:scale-[0.98]',
              active
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
