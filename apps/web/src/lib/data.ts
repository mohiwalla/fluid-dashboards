// Deterministic demo data and an in-memory API. Nothing leaves the browser.

export type CustomerStatus = "active" | "trial" | "churned"
export type Plan = "Free" | "Pro" | "Team" | "Enterprise"

export type Customer = {
  id: string
  name: string
  email: string
  plan: Plan
  status: CustomerStatus
  mrr: number
  seats: number
  joined: string
}

export type Point = { t: number; value: number }

const DAY = 86_400_000

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

const first = [
  "Ada",
  "Kai",
  "Mira",
  "Noah",
  "Rhea",
  "Leo",
  "Iris",
  "Omar",
  "Zoe",
  "Ravi",
  "Lena",
  "Theo",
  "Maya",
  "Ezra",
  "Nina",
  "Arjun",
  "Sara",
  "Felix",
  "Ines",
  "Yuki",
]
const last = [
  "Patel",
  "Okafor",
  "Lindqvist",
  "Moreau",
  "Tanaka",
  "Silva",
  "Novak",
  "Haddad",
  "Kim",
  "Fischer",
  "Rossi",
  "Mensah",
  "Costa",
  "Ivanova",
  "Byrne",
]
const plans: Plan[] = ["Free", "Pro", "Pro", "Team", "Team", "Enterprise"]
const planPrice: Record<Plan, number> = {
  Free: 0,
  Pro: 24,
  Team: 18,
  Enterprise: 42,
}

export function makeCustomers(count = 64): Customer[] {
  const r = rng(7)
  const now = Date.UTC(2026, 10, 18)
  return Array.from({ length: count }, (_, i) => {
    const name = `${first[Math.floor(r() * first.length)]} ${last[Math.floor(r() * last.length)]}`
    const plan = plans[Math.floor(r() * plans.length)]
    const roll = r()
    const status: CustomerStatus =
      plan === "Free"
        ? "trial"
        : roll < 0.14
          ? "churned"
          : roll < 0.3
            ? "trial"
            : "active"
    const seats =
      plan === "Free"
        ? 1
        : 1 + Math.floor(r() * (plan === "Enterprise" ? 80 : 20))
    return {
      id: `cus_${(1000 + i).toString(36)}`,
      name,
      email: `${name.toLowerCase().replace(" ", ".")}${i}@example.com`,
      plan,
      status,
      seats,
      mrr: status === "active" ? seats * planPrice[plan] : 0,
      joined: new Date(now - Math.floor(r() * 420) * DAY)
        .toISOString()
        .slice(0, 10),
    }
  })
}

export type Range = "7d" | "30d" | "90d"
export const RANGES: Range[] = ["7d", "30d", "90d"]
export const rangeDays: Record<Range, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
}

/** Daily revenue for the last 90 days, ending today. */
export function makeRevenue(): Point[] {
  const r = rng(42)
  const end = Date.UTC(2026, 10, 18)
  let value = 8200
  return Array.from({ length: 90 }, (_, i) => {
    value = Math.max(
      4000,
      value * (1 + (r() - 0.44) * 0.06) + Math.sin(i / 5) * 90
    )
    return { t: end - (89 - i) * DAY, value: Math.round(value) }
  })
}

export const channels = [
  { id: "direct", label: "Direct", share: 0.42, color: "var(--chart-1)" },
  { id: "partners", label: "Partners", share: 0.27, color: "var(--chart-2)" },
  {
    id: "marketplace",
    label: "Marketplace",
    share: 0.19,
    color: "var(--chart-3)",
  },
  { id: "referral", label: "Referral", share: 0.12, color: "var(--chart-4)" },
] as const

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Simulated network calls with latency, so busy states are real. */
export const api = {
  async archiveCustomer(id: string) {
    await wait(700)
    return { id }
  },
  async saveSettings<T>(settings: T): Promise<T> {
    await wait(800)
    if (
      typeof settings === "object" &&
      settings &&
      "email" in settings &&
      String(settings.email).endsWith("@fail.test")
    ) {
      throw new Error("The server rejected this email address.")
    }
    return settings
  },
}

export const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})
export const shortDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})
