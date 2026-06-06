'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FlaskConical,
  Settings,
  Menu,
  X,
  Atom,
  ChevronLeft,
  ChevronRight,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { OrgSwitcher } from './OrgSwitcher'
import { useOrg } from '@/lib/hooks/useOrg'
import type { OrgWithRole } from '@/types/api'

interface AppShellProps {
  children: React.ReactNode
  orgs: OrgWithRole[]
  userEmail: string
  userDisplayName?: string | null
}

interface NavItem {
  label: string
  href: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>
}

export function AppShell({ children, orgs, userEmail, userDisplayName }: AppShellProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const { activeOrg, activeOrgId, setActiveOrgId } = useOrg(orgs)

  const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Builds', href: '/builds', icon: FlaskConical },
  ]

  const adminNavItems: NavItem[] = activeOrg
    ? [{ label: 'Settings', href: `/org/${activeOrg.id}/settings`, icon: Settings }]
    : []

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const initials = (userDisplayName ?? userEmail)
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase() ?? '')
    .join('')

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className={cn('flex items-center border-b', collapsed ? 'justify-center px-2 py-4' : 'gap-2 px-4 py-4')}>
        <Atom className="h-6 w-6 text-primary shrink-0" />
        {!collapsed && <span className="font-bold text-lg tracking-tight">MEEN Data</span>}
      </div>

      {!collapsed && (
        <div className="px-3 py-3 border-b">
          <OrgSwitcher orgs={orgs} activeOrgId={activeOrgId} onSwitch={setActiveOrgId} />
        </div>
      )}

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            onClick={() => setSidebarOpen(false)}
            className={cn(
              'flex items-center rounded-md text-sm font-medium transition-colors',
              collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2',
              isActive(item.href)
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && item.label}
          </Link>
        ))}

        {adminNavItems.length > 0 && (
          <>
            <Separator className="my-2" />
            {adminNavItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center rounded-md text-sm font-medium transition-colors',
                  collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2',
                  isActive(item.href)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && item.label}
              </Link>
            ))}
          </>
        )}
      </nav>

      <div className="mt-auto border-t p-2 space-y-1">
        <Link
          href="/account"
          title="Account"
          onClick={() => setSidebarOpen(false)}
          className={cn(
            'flex items-center rounded-md text-sm transition-colors hover:bg-accent',
            collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2',
            pathname.startsWith('/account') && 'bg-primary/10 text-primary'
          )}
        >
          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
            {initials || <User className="h-4 w-4" />}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-medium truncate">{userDisplayName ?? 'Account'}</p>
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
            </div>
          )}
        </Link>

        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          className={cn('w-full', collapsed ? 'mx-auto' : 'justify-start gap-2')}
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && <span className="text-xs">Collapse</span>}
        </Button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside
        className={cn(
          'hidden md:flex flex-col border-r bg-card shrink-0 transition-[width] duration-300 ease-in-out',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex flex-col w-64 bg-card border-r z-10">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="flex items-center justify-between h-14 px-4 border-b bg-card shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="text-sm text-muted-foreground hidden sm:block">
              {activeOrg?.name ?? 'MEEN Data Viz'}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
