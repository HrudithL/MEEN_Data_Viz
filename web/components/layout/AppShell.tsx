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
import { ThemeToggle } from '@/components/theme/ThemeToggle'
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
      {/* Logo */}
      <div className={cn(
        'flex items-center border-b border-border/50',
        collapsed ? 'justify-center px-2 py-4' : 'gap-2.5 px-4 py-4'
      )}>
        <div className="h-7 w-7 rounded-lg icon-box-coral flex items-center justify-center shrink-0">
          <Atom className="h-4 w-4 text-primary" />
        </div>
        {!collapsed && (
          <span className="font-bold text-base tracking-tight gradient-text">MEEN Data</span>
        )}
      </div>

      {/* Org switcher */}
      {!collapsed && (
        <div className="px-3 py-3 border-b border-border/50">
          <OrgSwitcher orgs={orgs} activeOrgId={activeOrgId} onSwitch={setActiveOrgId} />
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            data-nav-label={`Loading ${item.label.toLowerCase()}…`}
            onClick={() => setSidebarOpen(false)}
            className={cn(
              'nav-link flex items-center rounded-lg text-sm font-medium transition-all duration-200 ease-snappy',
              collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2',
              isActive(item.href)
                ? 'nav-active border'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground border border-transparent'
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && item.label}
          </Link>
        ))}

        {adminNavItems.length > 0 && (
          <>
            <Separator className="my-2 bg-border/50" />
            {adminNavItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                data-nav-label={`Loading ${item.label.toLowerCase()}…`}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'nav-link flex items-center rounded-lg text-sm font-medium transition-all duration-200 ease-snappy',
                  collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2',
                  isActive(item.href)
                    ? 'nav-active border'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground border border-transparent'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && item.label}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* User + collapse */}
      <div className="mt-auto border-t border-border/50 p-2 space-y-1">
        <Link
          href="/account"
          title="Account"
          data-nav-label="Loading account…"
          onClick={() => setSidebarOpen(false)}
          className={cn(
            'nav-link flex items-center rounded-lg text-sm transition-all duration-200 ease-snappy hover:bg-accent border border-transparent',
            collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2',
            pathname.startsWith('/account') && 'nav-active border'
          )}
        >
          <div className={cn(
            'h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0',
            pathname.startsWith('/account')
              ? 'icon-box-coral text-primary'
              : 'bg-muted text-muted-foreground'
          )}>
            {initials || <User className="h-4 w-4" />}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-medium truncate text-foreground">{userDisplayName ?? 'Account'}</p>
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
            </div>
          )}
        </Link>

        <ThemeToggle collapsed={collapsed} />

        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          className={cn('w-full text-muted-foreground hover:text-foreground', collapsed ? 'mx-auto' : 'justify-start gap-2')}
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
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col border-r border-border/50 bg-card/80 backdrop-blur-sm shrink-0 transition-[width] duration-300 ease-in-out',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative flex flex-col w-64 bg-card border-r border-border z-10 animate-slide-in-right shadow-2xl">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 text-muted-foreground"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="flex items-center justify-between h-14 px-4 border-b border-border/50 bg-card/50 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-muted-foreground"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="text-sm text-muted-foreground hidden sm:block font-medium">
              {activeOrg?.name ?? 'MEEN Data Viz'}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto scrollbar-thin">{children}</main>
      </div>
    </div>
  )
}
