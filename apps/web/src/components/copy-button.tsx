import { useEffect, useRef, useState } from "react"
import { CheckIcon, CopyIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"

/** Copy icon blurs and scales into a green check in place; a toast appears only on failure. */
export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Couldn't copy", {
        description: "Select the text and copy it.",
      })
    }
  }

  const icon =
    "absolute inset-0 size-4 transition-[opacity,scale,filter] duration-200 ease-[var(--ease-out)]"
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={copied ? "Copied" : label}
      onClick={copy}
      className="shrink-0 text-muted-foreground"
    >
      <span className="relative size-4">
        <CopyIcon
          className={`${icon} ${copied ? "scale-50 opacity-0 blur-[4px]" : ""}`}
          aria-hidden
        />
        <CheckIcon
          className={`${icon} text-success ${copied ? "" : "scale-50 opacity-0 blur-[4px]"}`}
          aria-hidden
        />
      </span>
    </Button>
  )
}
