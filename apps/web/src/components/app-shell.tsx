import { useLayoutEffect, useRef, useState } from "react"
import { NavLink, Outlet, useLocation } from "react-router"
import { LayoutDashboardIcon, SettingsIcon, UsersIcon } from "lucide-react"

import { Toaster } from "@workspace/ui/components/sonner"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import { CommandPalette } from "@/components/command-palette"
import { ShortcutsDialog } from "@/components/shortcuts-dialog"

export const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboardIcon },
  { to: "/customers", label: "Customers", icon: UsersIcon },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const

export function AppShell() {
  const { pathname } = useLocation()
  const current = NAV.find((item) => item.to === pathname) ?? NAV[0]

  return (
    <TooltipProvider delay={400}>
      <div className="min-h-svh lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-svh flex-col border-r px-2 pb-2 lg:flex">
          <Wordmark className="h-14 shrink-0 px-2" />
          <Nav orientation="vertical" className="mt-1" />
          <div className="mt-auto px-2 py-2 text-xs text-muted-foreground">
            Demo data · stays in this browser
          </div>
        </aside>

        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
            <div className="mx-auto flex h-14 w-full max-w-[1488px] items-center gap-3 px-4 sm:px-6">
              <Wordmark className="lg:hidden" />
              <h1 className="sr-only text-base font-semibold lg:not-sr-only">
                {current.label}
              </h1>
              <div className="ml-auto flex items-center gap-2">
                <ShortcutsDialog />
                <CommandPalette />
              </div>
            </div>
            <Nav
              orientation="horizontal"
              className="px-4 pb-2 sm:px-6 lg:hidden"
            />
          </header>

          <main className="mx-auto w-full max-w-[1488px] min-w-0 flex-1 px-4 py-4 sm:px-6 sm:py-6">
            <Outlet />
          </main>
        </div>
      </div>
      <Toaster position="bottom-right" />
    </TooltipProvider>
  )
}

function Wordmark({ className = "" }: { className?: string }) {
  return (
    <a
      href="/"
      className={`flex items-center gap-2 rounded-md text-[15px] font-semibold ${className}`}
    >
      <img src="/favicon.svg" alt="" className="size-5" />
      <span>
        fluid{" "}
        <span className="font-normal text-muted-foreground">dashboards</span>
      </span>
    </a>
  )
}

/**
 * Nav links with one sliding active indicator. Links get no hover background;
 * the active one is marked by text color and the indicator.
 */
function Nav({
  orientation,
  className = "",
}: {
  orientation: "vertical" | "horizontal"
  className?: string
}) {
  const listRef = useRef<HTMLElement>(null)
  const { pathname } = useLocation()
  const [box, setBox] = useState<{
    x: number
    y: number
    w: number
    h: number
  } | null>(null)
  const [ready, setReady] = useState(false)

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    const measure = () => {
      const active = list.querySelector<HTMLElement>('[aria-current="page"]')
      if (!active || !list.offsetWidth) return
      setBox({
        x: active.offsetLeft,
        y: active.offsetTop,
        w: active.offsetWidth,
        h: active.offsetHeight,
      })
    }
    measure()
    const frame = requestAnimationFrame(() => setReady(true))
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [pathname])

  const vertical = orientation === "vertical"
  return (
    <nav
      ref={listRef}
      aria-label="Main"
      className={`relative isolate flex ${vertical ? "flex-col gap-1" : "gap-1"} ${className}`}
    >
      {box && (
        <span
          aria-hidden
          className={`absolute top-0 left-0 -z-10 rounded-md bg-accent ${ready ? "transition-[transform,width,height] duration-200 ease-[var(--ease-in-out)]" : ""}`}
          style={{
            transform: `translate(${box.x}px, ${box.y}px)`,
            width: box.w,
            height: box.h,
          }}
        />
      )}
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) =>
            `flex items-center gap-2 rounded-md px-2 font-medium transition-colors ${
              vertical
                ? "h-8"
                : "h-9 flex-1 justify-center sm:flex-none sm:px-3"
            } ${isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`
          }
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
