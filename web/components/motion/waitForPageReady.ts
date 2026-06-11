function nextFrame(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function waitForWindowLoad(timeoutMs: number): Promise<void> {
  if (document.readyState === 'complete') return Promise.resolve()

  return new Promise(resolve => {
    const done = () => {
      clearTimeout(timer)
      resolve()
    }
    const timer = setTimeout(done, timeoutMs)
    window.addEventListener('load', done, { once: true })
  })
}

function waitForImages(root: ParentNode, timeoutMs: number): Promise<void> {
  const images = Array.from(root.querySelectorAll('img')).filter(
    (img): img is HTMLImageElement => img instanceof HTMLImageElement && Boolean(img.src)
  )
  const pending = images.filter(img => !img.complete)

  if (pending.length === 0) return Promise.resolve()

  return new Promise(resolve => {
    let remaining = pending.length
    const finish = () => {
      remaining -= 1
      if (remaining <= 0) resolve()
    }
    const timer = setTimeout(resolve, timeoutMs)

    for (const img of pending) {
      img.addEventListener('load', finish, { once: true })
      img.addEventListener('error', finish, { once: true })
    }

    Promise.resolve().then(() => {
      if (remaining <= 0) {
        clearTimeout(timer)
        resolve()
      }
    })
  })
}

function mainHasLoadingIndicators(main: Element): boolean {
  if (main.getAttribute('aria-busy') === 'true') return true

  return Boolean(
    main.querySelector(
      [
        '.animate-spin',
        '[data-loading="true"]',
        '.skeleton-shimmer',
        '[data-slot="progress"]',
      ].join(', ')
    )
  )
}

/**
 * Waits until the new route has painted and main content looks settled:
 * fonts, images, and common in-page loading indicators are gone.
 */
export async function waitForPageReady(maxWaitMs = 12_000): Promise<void> {
  const started = Date.now()

  await nextFrame()
  await waitForWindowLoad(4_000)

  try {
    await document.fonts?.ready
  } catch {
    // ignore
  }

  while (Date.now() - started < maxWaitMs) {
    const main = document.querySelector('main')
    if (!main) {
      await delay(60)
      continue
    }

    await waitForImages(main, 2_000)

    if (!mainHasLoadingIndicators(main)) {
      // Stability pass — catch late-mounting spinners
      await delay(120)
      if (!mainHasLoadingIndicators(main)) break
    }

    await delay(80)
  }

  await nextFrame()
}
