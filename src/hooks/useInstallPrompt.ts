import * as React from 'react'

// The browser event fired when a PWA becomes installable. Chrome/Edge/most
// Android browsers support this; Safari (iOS and macOS) never fires it, so
// those platforms are detected separately below and shown manual steps
// instead of a one-tap button.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone() {
  if (typeof window === 'undefined') return false
  const mediaStandalone = window.matchMedia?.('(display-mode: standalone)').matches
  // iOS Safari's own (non-standard) flag for "already added to home screen".
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  return Boolean(mediaStandalone || iosStandalone)
}

function isIosSafari() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isIos = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
  return isIos && isSafari
}

/**
 * Drives the "Install App" UI across platforms:
 * - Chrome/Edge/Android: captures the native `beforeinstallprompt` event and
 *   exposes `promptInstall()` to trigger the browser's own install dialog.
 * - iOS Safari: never fires that event, so `platform` is set to 'ios' and
 *   the UI should show manual "Share -> Add to Home Screen" steps instead.
 * - Already installed (running standalone): `installed` is true so the UI
 *   can hide itself.
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = React.useState(isStandalone)

  React.useEffect(() => {
    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    function onInstalled() {
      setInstalled(true)
      setDeferredPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const platform: 'android-chromium' | 'ios' | 'unsupported' = deferredPrompt
    ? 'android-chromium'
    : isIosSafari()
      ? 'ios'
      : 'unsupported'

  async function promptInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setDeferredPrompt(null)
  }

  return {
    installed,
    canPromptInstall: Boolean(deferredPrompt),
    platform,
    promptInstall,
  }
}
