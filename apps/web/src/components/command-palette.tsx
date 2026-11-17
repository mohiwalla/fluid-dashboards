import { useState } from "react"
import { useNavigate } from "react-router"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandItemIcon,
  CommandList,
  CommandSeparator,
} from "@ui-sdk/react/command"
import {
  Dialog,
  DialogBackdrop,
  DialogContent,
  DialogShortcut,
  DialogTitle,
  DialogTrigger,
} from "@ui-sdk/react/dialog"
import { KeyboardIcon, LinkIcon, SearchIcon, UserIcon } from "lucide-react"
import { toast } from "sonner"

import { NAV } from "@/components/app-shell"
import { openShortcuts } from "@/components/shortcuts-dialog"
import { makeCustomers } from "@/lib/data"

const people = makeCustomers().slice(0, 12)

/** ⌘K palette: ui-sdk Dialog + Command handle focus, filtering and the shortcut. */
export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const run = (value: string) => {
    setOpen(false)
    if (value.startsWith("go:")) navigate(value.slice(3))
    else if (value.startsWith("customer:"))
      navigate(`/customers?q=${encodeURIComponent(value.slice(9))}`)
    else if (value === "shortcuts") openShortcuts()
    else if (value === "copy-link") {
      navigator.clipboard.writeText(location.href).then(
        () => toast.success("Link copied", { description: location.pathname }),
        () =>
          toast.error("Couldn't copy", {
            description: "Copy the address from the browser bar.",
          })
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        shortcut="mod+k"
        className="inline-flex h-9 w-9 items-center justify-center gap-2 rounded-lg border border-input bg-input/30 text-muted-foreground transition-colors hover:bg-input/50 hover:text-foreground sm:w-56 sm:justify-start sm:px-3"
        aria-label="Search"
      >
        <SearchIcon className="size-4 shrink-0" aria-hidden />
        <span className="hidden sm:inline">Search…</span>
        <DialogShortcut className="ml-auto hidden rounded border px-1.5 font-mono text-xs sm:inline" />
      </DialogTrigger>
      <DialogBackdrop />
      <DialogContent className="palette">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <Command onAction={run}>
          <div className="flex h-12 items-center gap-2 border-b px-3">
            <SearchIcon className="size-4 text-muted-foreground" aria-hidden />
            <CommandInput
              aria-label="Search commands"
              placeholder="Type a command or search…"
              className="h-full flex-1 bg-transparent outline-none placeholder:text-muted-foreground focus-visible:shadow-none"
            />
          </div>
          <CommandEmpty className="px-3 py-6 text-center text-muted-foreground">
            No results.
          </CommandEmpty>
          <CommandList>
            <CommandGroup>
              <CommandGroupLabel>Pages</CommandGroupLabel>
              {NAV.map(({ to, label, icon: Icon }) => (
                <CommandItem key={to} value={`go:${to}`}>
                  <CommandItemIcon>
                    <Icon />
                  </CommandItemIcon>
                  {label}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandGroupLabel>Actions</CommandGroupLabel>
              <CommandItem value="copy-link" keywords={["share", "url"]}>
                <CommandItemIcon>
                  <LinkIcon />
                </CommandItemIcon>
                Copy page link
              </CommandItem>
              <CommandItem
                value="shortcuts"
                label="Keyboard shortcuts"
                keywords={["help", "keys"]}
              >
                <CommandItemIcon>
                  <KeyboardIcon />
                </CommandItemIcon>
                Keyboard shortcuts
                <kbd className="ml-auto font-mono text-xs text-muted-foreground">
                  ?
                </kbd>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandGroupLabel>Customers</CommandGroupLabel>
              {people.map((person) => (
                <CommandItem
                  key={person.id}
                  value={`customer:${person.name}`}
                  label={person.name}
                  keywords={[person.email]}
                >
                  <CommandItemIcon>
                    <UserIcon />
                  </CommandItemIcon>
                  <span className="truncate">{person.name}</span>
                  <span className="ml-auto truncate text-[13px] text-muted-foreground">
                    {person.plan}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
