'use client'

import { Suspense } from 'react'
import { NavigationLoadingProvider } from './NavigationLoadingProvider'

function NavigationLoadingFallback({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function NavigationProgressBar({ children }: { children?: React.ReactNode }) {
  return (
    <Suspense fallback={<NavigationLoadingFallback>{children}</NavigationLoadingFallback>}>
      <NavigationLoadingProvider>{children}</NavigationLoadingProvider>
    </Suspense>
  )
}
