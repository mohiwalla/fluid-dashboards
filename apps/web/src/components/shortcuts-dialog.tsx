import { useEffect, useRef, useState } from "react"
import { formatShortcut, shortcuts, useShortcut } from "@ui-sdk/react/shortcuts"
import { KeyboardIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

type Row = { hint: string; description: string }

// Static entries for keys handled by components rather than useShortcut.
const BUILT_IN: Row[] = [
  { hint: "↑ ↓", description: "Move through palette results" },
  { hint: "← →", description: "Inspect chart points, switch segments" },
]

let openExternally: (() => void) | null = null
export const openShortcuts = () => openExternally?.()

/** Lists the shortcuts registered through ui-sdk at the moment it opens. */
export function ShortcutsDialog() {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const opener = useRef<HTMLElement | null>(null)

  const show = () => {
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const live = shortcuts
      .list()
      .filter((s) => s.description)
      .map((s) => ({ hint: s.hint, description: s.description ?? "" }))
    setRows([
      { hint: formatShortcut("mod+k"), description: "Open command palette" },
      ...live,
      ...BUILT_IN,
    ])
    setOpen(true)
  }

  useEffect(() => {
    openExternally = show
    return () => {
      openExternally = null
    }
  })
  useShortcut("?", show, { description: "Show keyboard shortcuts" })

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Keyboard shortcuts"
            onClick={show}
          >
            <KeyboardIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Shortcuts · ?</TooltipContent>
      </Tooltip>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-md"
          onCloseAutoFocus={(event) => {
            // Return focus to whatever opened the dialog (button, palette or shortcut).
            if (opener.current?.isConnected) {
              event.preventDefault()
              opener.current.focus()
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
            <DialogDescription>Available on this page.</DialogDescription>
          </DialogHeader>
          <ul className="divide-y overflow-hidden rounded-lg border">
            {rows.map((row) => (
              <li
                key={row.description}
                className="flex h-11 items-center justify-between gap-4 px-3"
              >
                <span>{row.description}</span>
                <kbd className="rounded border bg-muted/40 px-1.5 font-mono text-xs leading-5">
                  {row.hint}
                </kbd>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  )
}
