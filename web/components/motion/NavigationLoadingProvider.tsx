'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { flushSync } from 'react-dom'
import { NavigationOverlay } from './NavigationOverlay'
import {
  resolveNavigationDisplay,
  type NavigationDisplay,
} from './navigationMessages'
import { waitForPageReady } from './waitForPageReady'

interface NavigationLoadingContextValue {
  startNavigation: (href: string, legacyLabel?: string) => void
}

const NavigationLoadingContext = createContext<NavigationLoadingContextValue | null>(
  null
)

const FALLBACK_DISPLAY: NavigationDisplay = {
  destination: 'Workspace',
  headline: 'One moment',
  tagline: 'Your next view is loading.',
  statusMessages: ['Preparing workspace…'],
}

export function useNavigationLoading() {
  return useContext(NavigationLoadingContext)
}

function isInternalNavigationAnchor(anchor: HTMLAnchorElement): URL | null {
  if (anchor.getAttribute('target') === '_blank') return null
  if (anchor.hasAttribute('download')) return null

  const rawHref = anchor.getAttribute('href')
  if (!rawHref || rawHref.startsWith('#')) return null

  let url: URL
  try {
    url = new URL(anchor.href, window.location.href)
  } catch {
    return null
  }

  if (url.origin !== window.location.origin) return null
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null

  return url
}

function NavigationLoadingProviderInner({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [isNavigating, setIsNavigating] = useState(false)
  const [display, setDisplay] = useState<NavigationDisplay>(FALLBACK_DISPLAY)
  const [progress, setProgress] = useState(0)

  const trickleRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navGenerationRef = useRef(0)
  const isFirstRouteRef = useRef(true)
  const finishingRef = useRef(false)

  const clearTimers = useCallback(() => {
    if (trickleRef.current) {
      clearInterval(trickleRef.current)
      trickleRef.current = null
    }
    if (hideRef.current) {
      clearTimeout(hideRef.current)
      hideRef.current = null
    }
  }, [])

  const startNavigation = useCallback(
    (href: string, legacyLabel?: string) => {
      navGenerationRef.current += 1
      finishingRef.current = false
      clearTimers()
      const nextDisplay = resolveNavigationDisplay(href, legacyLabel)
      flushSync(() => {
        setDisplay(nextDisplay)
        setIsNavigating(true)
        setProgress(14)
      })
      trickleRef.current = setInterval(() => {
        setProgress(prev => (prev >= 90 ? prev : prev + Math.random() * 5 + 2))
      }, 320)
    },
    [clearTimers]
  )

  const finishNavigation = useCallback(async () => {
    if (finishingRef.current) return
    finishingRef.current = true
    const generation = navGenerationRef.current

    try {
      await waitForPageReady()
      if (generation !== navGenerationRef.current) return

      clearTimers()
      setProgress(100)
      hideRef.current = setTimeout(() => {
        if (generation !== navGenerationRef.current) return
        setIsNavigating(false)
        setProgress(0)
        finishingRef.current = false
      }, 320)
    } catch {
      finishingRef.current = false
    }
  }, [clearTimers])

  const startNavigationRef = useRef(startNavigation)
  startNavigationRef.current = startNavigation

  const pathnameRef = useRef(pathname)
  const searchKey = searchParams.toString()
  const searchKeyRef = useRef(searchKey)

  useEffect(() => {
    if (isFirstRouteRef.current) {
      isFirstRouteRef.current = false
      pathnameRef.current = pathname
      searchKeyRef.current = searchKey
      return
    }

    if (pathnameRef.current !== pathname || searchKeyRef.current !== searchKey) {
      pathnameRef.current = pathname
      searchKeyRef.current = searchKey
      void finishNavigation()
    }
  }, [pathname, searchKey, finishNavigation])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return
      if (event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const anchor = (event.target as Element | null)?.closest('a')
      if (!anchor) return

      const url = isInternalNavigationAnchor(anchor)
      if (!url) return

      const nextPath = url.pathname
      const nextSearch = url.search
      const currentSearch = window.location.search

      if (nextPath === pathname && nextSearch === currentSearch) return

      event.preventDefault()
      event.stopPropagation()

      const legacyLabel =
        anchor.getAttribute('data-nav-label') ??
        anchor.getAttribute('aria-label') ??
        undefined

      const href = `${nextPath}${nextSearch}${url.hash}`
      startNavigationRef.current(href, legacyLabel)
      router.push(href)
    }

    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [pathname, router])

  useEffect(() => clearTimers, [clearTimers])

  // Lock body scroll while overlay is open (compensate scrollbar width to avoid layout shift)
  useEffect(() => {
    if (!isNavigating) return
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    const prevOverflow = document.body.style.overflow
    const prevPaddingRight = document.body.style.paddingRight
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }
    return () => {
      document.body.style.overflow = prevOverflow
      document.body.style.paddingRight = prevPaddingRight
    }
  }, [isNavigating])

  return (
    <NavigationLoadingContext.Provider value={{ startNavigation }}>
      {children}
      <NavigationOverlay open={isNavigating} display={display} progress={progress} />
    </NavigationLoadingContext.Provider>
  )
}

export function NavigationLoadingProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <NavigationLoadingProviderInner>{children}</NavigationLoadingProviderInner>
  )
}
