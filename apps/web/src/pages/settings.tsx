import { useState, type ReactNode } from "react"
import { Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Switch } from "@workspace/ui/components/switch"
import { CopyButton } from "@/components/copy-button"
import { Segmented } from "@/components/segmented"
import { api } from "@/lib/data"
import { usePref } from "@/lib/prefs"

const PROFILE_KEY = "fluid-dashboards:profile"
const DEMO_KEY = "fd_demo_8f2c41e09b7a4d5c"
type Profile = { name: string; email: string }
type Errors = Partial<Record<keyof Profile, string>>

function loadProfile(): Profile {
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null")
    if (typeof saved?.name === "string" && typeof saved?.email === "string")
      return saved
  } catch {
    // Fall through to the default.
  }
  return { name: "Avery Quinn", email: "avery@example.com" }
}

export function SettingsPage() {
  const [saved, setSaved] = useState(loadProfile)
  const [draft, setDraft] = useState(saved)
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)
  const [density, setDensity] = usePref("settings.density", "comfortable", [
    "comfortable",
    "compact",
  ] as const)
  const [digest, setDigest] = usePref<boolean>("settings.digest", true)
  const [alerts, setAlerts] = usePref<boolean>("settings.alerts", false)
  const dirty = draft.name !== saved.name || draft.email !== saved.email

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    const next: Errors = {}
    if (!draft.name.trim()) next.name = "Enter a name."
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email))
      next.email = "Enter an email like name@company.com."
    setErrors(next)
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      const result = await api.saveSettings(draft)
      localStorage.setItem(PROFILE_KEY, JSON.stringify(result))
      setSaved(result)
      toast.success("Profile saved", {
        description: `Signed in as ${result.email}.`,
      })
    } catch (e) {
      setErrors({
        email: e instanceof Error ? e.message : "Couldn't save. Try again.",
      })
    } finally {
      setBusy(false)
    }
  }

  const resetDemo = () => {
    try {
      localStorage.removeItem(PROFILE_KEY)
      localStorage.removeItem("fluid-dashboards:prefs")
    } catch {
      // Nothing stored.
    }
    location.reload()
  }

  return (
    <div className="grid w-full max-w-3xl gap-6 sm:gap-8">
      <Section title="Profile">
        <form onSubmit={save} noValidate className="grid gap-4 p-4 sm:px-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="name" label="Name" error={errors.name}>
              <Input
                id="name"
                autoComplete="name"
                value={draft.name}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "name-error" : undefined}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </Field>
            <Field id="email" label="Email" error={errors.email}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={draft.email}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!dirty || busy}
              onClick={() => {
                setDraft(saved)
                setErrors({})
              }}
            >
              Discard
            </Button>
            <Button
              type="submit"
              disabled={!dirty || busy}
              aria-busy={busy || undefined}
            >
              {busy && <Loader2Icon className="animate-spin" aria-hidden />}
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Section>

      <Section title="Preferences">
        <Row
          label="Table density"
          description="Row height on the customers table."
        >
          <Segmented
            label="Table density"
            value={density}
            onChange={setDensity}
            options={[
              { value: "comfortable", label: "Comfortable" },
              { value: "compact", label: "Compact" },
            ]}
          />
        </Row>
        <Row
          label="Weekly digest"
          htmlFor="digest"
          description="Revenue summary every Monday."
        >
          <Switch id="digest" checked={digest} onCheckedChange={setDigest} />
        </Row>
        <Row
          label="Churn alerts"
          htmlFor="alerts"
          description="Email when a paying customer cancels."
        >
          <Switch id="alerts" checked={alerts} onCheckedChange={setAlerts} />
        </Row>
      </Section>

      <Section title="API">
        <Row label="Demo key" description="Read-only, for local testing.">
          <div className="flex min-w-0 items-center gap-1 rounded-lg border bg-input/30 pl-3">
            <code className="truncate font-mono text-[13px]">{DEMO_KEY}</code>
            <CopyButton text={DEMO_KEY} label="Copy demo key" />
          </div>
        </Row>
      </Section>

      <Section title="Reset">
        <Row
          label="Reset demo"
          description="Clears saved filters, preferences and profile on this device."
        >
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" />}>
              Reset
            </AlertDialogTrigger>
            <AlertDialogContent className="sm:max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle>Reset this demo?</AlertDialogTitle>
                <AlertDialogDescription>
                  Saved filters, preferences and your profile are removed from
                  this browser. This can't be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={resetDemo}>
                  Reset
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Row>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = `section-${title.toLowerCase()}`
  return (
    <section aria-labelledby={id} className="min-w-0">
      <h2 id={id} className="mb-3 text-base leading-6 font-semibold">
        {title}
      </h2>
      <div className="divide-y overflow-hidden rounded-xl border bg-card">
        {children}
      </div>
    </section>
  )
}

function Row({
  label,
  description,
  htmlFor,
  children,
}: {
  label: string
  description: string
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-14 flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-5 sm:py-4">
      <div className="mr-auto grid min-w-0">
        {htmlFor ? (
          <Label htmlFor={htmlFor} className="font-medium">
            {label}
          </Label>
        ) : (
          <span className="font-medium">{label}</span>
        )}
        <span className="text-[13px] leading-[18px] text-muted-foreground">
          {description}
        </span>
      </div>
      <div className="flex max-w-full min-w-0">{children}</div>
    </div>
  )
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && (
        <p
          id={`${id}-error`}
          className="text-[13px] leading-[18px] text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  )
}
