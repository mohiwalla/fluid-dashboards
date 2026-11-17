import { useState } from "react"
import { Loader2Icon } from "lucide-react"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import type { Customer } from "@/lib/data"

/** Confirms before archiving. The button stays busy until the request settles; errors stay in the dialog. */
export function ArchiveDialog({
  targets,
  onClose,
  onConfirm,
}: {
  targets: Customer[] | null
  onClose: () => void
  onConfirm: (targets: Customer[]) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const one = targets?.length === 1 ? targets[0] : null

  const confirm = async () => {
    if (!targets) return
    setBusy(true)
    setError(null)
    try {
      await onConfirm(targets)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Archive failed. Try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <AlertDialog
      open={!!targets}
      onOpenChange={(open) => {
        if (!open && !busy) {
          setError(null)
          onClose()
        }
      }}
    >
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {one
              ? `Archive ${one.name}?`
              : `Archive ${targets?.length ?? 0} customers?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {one ? `${one.email} stops` : "They stop"} counting toward MRR and
            leave this list. You can undo right after.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-[13px] text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={confirm}
            disabled={busy}
            aria-busy={busy || undefined}
          >
            {busy && <Loader2Icon className="animate-spin" aria-hidden />}
            {busy ? "Archiving…" : "Archive"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
