'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  collapsed?: boolean
}

export function ThemeToggle({ collapsed }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = (resolvedTheme ?? theme) === 'dark'

  return (
    <Button
      variant="ghost"
      size={collapsed ? 'icon' : 'sm'}
      className={cn(
        'w-full text-muted-foreground hover:text-foreground',
        collapsed ? 'mx-auto' : 'justify-start gap-2'
      )}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      disabled={!mounted}
    >
      {mounted ? (
        isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
      ) : (
        <span className="h-4 w-4" />
      )}
      {!collapsed && (
        <span className="text-xs">{mounted ? (isDark ? 'Light mode' : 'Dark mode') : 'Theme'}</span>
      )}
    </Button>
  )
}
