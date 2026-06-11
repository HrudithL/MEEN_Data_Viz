'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useNavigationLoading } from './NavigationLoadingProvider'

/** Router wrapper that shows the navigation overlay before programmatic navigations. */
export function useAppRouter() {
  const router = useRouter()
  const navigation = useNavigationLoading()

  return useMemo(
    () => ({
      push: (href: string, label?: string) => {
        navigation?.startNavigation(href, label)
        router.push(href)
      },
      replace: (href: string, label?: string) => {
        navigation?.startNavigation(href, label)
        router.replace(href)
      },
      refresh: router.refresh,
      back: router.back,
      forward: router.forward,
      prefetch: router.prefetch,
    }),
    [router, navigation]
  )
}
