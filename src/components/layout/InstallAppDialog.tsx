import { Share, SquarePlus, MoreVertical, Download } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'

export function InstallAppDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { platform, canPromptInstall, promptInstall } = useInstallPrompt()

  async function handleInstallClick() {
    await promptInstall()
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Install the App"
      description="Add NKY. METH. JHS IGF Tracker to your device for quick, offline-friendly access - no app store needed."
    >
      <div className="space-y-4">
        {canPromptInstall ? (
          <div className="space-y-3">
            <p className="text-sm text-foreground">
              Your browser can install this app directly. Tap the button below and choose "Install".
            </p>
            <Button onClick={() => void handleInstallClick()} className="w-full" size="lg">
              <Download size={18} /> Install App
            </Button>
          </div>
        ) : platform === 'ios' ? (
          <div className="space-y-3">
            <p className="text-sm text-foreground">On an iPhone or iPad, install it from Safari's Share menu:</p>
            <ol className="space-y-2 text-sm text-foreground">
              <li className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-900">
                  1
                </span>
                Tap the <Share size={16} className="inline text-brand-700" /> <strong>Share</strong> button in
                Safari's toolbar.
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-900">
                  2
                </span>
                Scroll down and tap{' '}
                <span className="inline-flex items-center gap-1 font-medium">
                  <SquarePlus size={16} className="text-brand-700" /> Add to Home Screen
                </span>
                .
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-900">
                  3
                </span>
                Tap <strong>Add</strong> in the top right corner.
              </li>
            </ol>
            <p className="text-xs text-muted">This must be done from Safari - other iOS browsers can't install apps.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-foreground">
              Look for an <strong>Install app</strong> or <strong>Add to Home Screen</strong> option in your
              browser's menu:
            </p>
            <p className="flex items-center gap-2 text-sm text-muted">
              <MoreVertical size={16} className="text-brand-700" /> Usually under the ⋮ or ☰ menu in the top corner
              of the browser.
            </p>
            <p className="text-xs text-muted">
              If you don't see this option, you can keep using the app in your browser - everything still works.
            </p>
          </div>
        )}
      </div>
    </Dialog>
  )
}
