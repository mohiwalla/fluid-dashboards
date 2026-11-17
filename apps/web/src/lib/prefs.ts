import { useCallback, useState } from "react"

const KEY = "fluid-dashboards:prefs"

function readAll(): Record<string, unknown> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") ?? {}
  } catch {
    return {}
  }
}

/**
 * A view choice that survives reloads. The saved value is validated against
 * `allowed` on restore and falls back to `fallback` when it no longer exists.
 */
export function usePref<T extends string | boolean>(
  name: string,
  fallback: T,
  allowed?: readonly T[]
) {
  const [value, setValue] = useState<T>(() => {
    const saved = readAll()[name]
    if (allowed) return allowed.includes(saved as T) ? (saved as T) : fallback
    return typeof saved === typeof fallback ? (saved as T) : fallback
  })
  const set = useCallback(
    (next: T) => {
      setValue(next)
      try {
        localStorage.setItem(
          KEY,
          JSON.stringify({ ...readAll(), [name]: next })
        )
      } catch {
        // Storage can be unavailable; the choice still applies for this session.
      }
    },
    [name]
  )
  return [value, set] as const
}
