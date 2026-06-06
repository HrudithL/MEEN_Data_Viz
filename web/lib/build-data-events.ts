export const BUILD_DATA_CHANGED = 'build-data-changed'

export function notifyBuildDataChanged(buildId: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(BUILD_DATA_CHANGED, { detail: { buildId } }))
}

export function onBuildDataChanged(buildId: string, handler: () => void) {
  if (typeof window === 'undefined') return () => {}
  const listener = (e: Event) => {
    const detail = (e as CustomEvent<{ buildId: string }>).detail
    if (detail?.buildId === buildId) handler()
  }
  window.addEventListener(BUILD_DATA_CHANGED, listener)
  return () => window.removeEventListener(BUILD_DATA_CHANGED, listener)
}
