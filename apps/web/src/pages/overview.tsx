import { useEffect, useMemo, useState } from "react"
import { Meter, MeterIndicator, MeterTrack } from "@ui-sdk/react/meter"
import { ArrowDownRightIcon, ArrowUpRightIcon } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Label } from "@workspace/ui/components/label"
import { Switch } from "@workspace/ui/components/switch"
import { LineChart } from "@/components/line-chart"
import { Segmented } from "@/components/segmented"
import {
  channels,
  makeCustomers,
  makeRevenue,
  money,
  RANGES,
  rangeDays,
  shortDate,
  type Point,
  type Range,
} from "@/lib/data"
import { usePref } from "@/lib/prefs"

const DAY = 86_400_000
const customers = makeCustomers()

export function OverviewPage() {
  const [range, setRange] = usePref<Range>("overview.range", "30d", RANGES)
  const [showForecast, setShowForecast] = usePref<boolean>(
    "overview.forecast",
    false
  )
  const [live, setLive] = usePref<boolean>("overview.live", true)
  const series = useLiveRevenue(live)

  const days = rangeDays[range]
  const points = series.slice(-days)
  const previous = series.slice(-days * 2, -days)
  const forecast = useMemo(
    () =>
      showForecast ? project(points, Math.max(3, Math.round(days / 6))) : [],
    [showForecast, points, days]
  )

  const total = sum(points)
  const prevTotal = previous.length === days ? sum(previous) : null
  const active = customers.filter((c) => c.status === "active")
  const mrr = active.reduce((acc, c) => acc + c.mrr, 0)
  const churned = customers.filter((c) => c.status === "churned").length

  return (
    <div className="grid gap-4">
      <section
        aria-label="Key metrics"
        className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-4"
      >
        <Kpi
          label={`Revenue · ${range}`}
          value={money.format(total)}
          delta={prevTotal ? total / prevTotal - 1 : null}
        />
        <Kpi label="MRR" value={money.format(mrr)} delta={0.064} />
        <Kpi
          label="Active customers"
          value={String(active.length)}
          delta={0.031}
        />
        <Kpi
          label="Churn"
          value={`${((churned / customers.length) * 100).toFixed(1)}%`}
          delta={-0.008}
          invert
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,30%)]">
        <section
          aria-labelledby="revenue-title"
          className="min-w-0 rounded-xl border bg-card px-4 py-3 sm:px-6 sm:py-4"
        >
          <header className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <div className="mr-auto">
              <h2 id="revenue-title" className="font-semibold">
                Revenue
              </h2>
              <p className="text-[13px] leading-[18px] text-muted-foreground">
                Daily, last {days} days
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Toggle
                id="live"
                label="Live"
                checked={live}
                onChange={setLive}
              />
              <Toggle
                id="forecast"
                label="Forecast"
                checked={showForecast}
                onChange={setShowForecast}
              />
            </div>
            <Segmented
              label="Range"
              value={range}
              onChange={setRange}
              options={RANGES.map((r) => ({
                value: r,
                label: r,
                title: `Last ${rangeDays[r]} days`,
              }))}
            />
          </header>
          <div className="mt-4">
            <LineChart
              label={`Daily revenue, last ${days} days`}
              points={points}
              forecast={forecast}
              format={money.format}
              formatTime={(t) => shortDate.format(t)}
            />
          </div>
        </section>

        <section
          aria-labelledby="channels-title"
          className="flex flex-col rounded-xl border bg-card px-4 py-3 sm:px-6 sm:py-4"
        >
          <header className="pb-1">
            <h2 id="channels-title" className="font-semibold">
              Channels
            </h2>
          </header>
          <ul className="grid flex-1 auto-rows-fr divide-y">
            {channels.map((channel) => (
              <li
                key={channel.id}
                className="flex flex-col justify-center gap-2 py-3 last:pb-0"
              >
                <div className="flex items-baseline gap-2">
                  <span className="font-medium">{channel.label}</span>
                  <span className="tabular ml-auto font-mono text-[13px] text-muted-foreground">
                    {money.format(total * channel.share)}
                  </span>
                </div>
                <Meter
                  value={channel.share * 100}
                  aria-label={`${channel.label} share`}
                  format={{ style: "percent" }}
                  max={100}
                >
                  <MeterTrack className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <MeterIndicator
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{ background: channel.color }}
                    />
                  </MeterTrack>
                </Meter>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

function Kpi({
  label,
  value,
  delta,
  invert = false,
}: {
  label: string
  value: string
  delta: number | null
  invert?: boolean
}) {
  const good = delta !== null && (invert ? delta < 0 : delta > 0)
  return (
    <div className="rounded-xl border bg-card px-4 py-3 sm:p-4">
      <div className="text-[13px] leading-[18px] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className="tabular font-mono text-2xl leading-8 font-semibold tracking-tight">
          {value}
        </span>
        {delta !== null && (
          <Badge variant={good ? "success" : "destructive"} className="ml-auto">
            {delta >= 0 ? (
              <ArrowUpRightIcon aria-hidden />
            ) : (
              <ArrowDownRightIcon aria-hidden />
            )}
            {Math.abs(delta * 100).toFixed(1)}%
          </Badge>
        )}
      </div>
    </div>
  )
}

function Toggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <Label
        htmlFor={id}
        className="text-[13px] font-normal text-muted-foreground"
      >
        {label}
      </Label>
    </div>
  )
}

/** Live mode nudges today's value every few seconds; nothing else re-renders visibly. */
function useLiveRevenue(live: boolean) {
  const [series, setSeries] = useState(makeRevenue)
  useEffect(() => {
    if (!live) return
    const id = setInterval(() => {
      setSeries((prev) => {
        const last = prev[prev.length - 1]
        return [
          ...prev.slice(0, -1),
          {
            ...last,
            value: Math.round(last.value + (Math.random() - 0.35) * 60),
          },
        ]
      })
    }, 2500)
    return () => clearInterval(id)
  }, [live])
  return series
}

/** Least-squares trend over the last 14 points; projected points are labelled as such. */
function project(points: Point[], count: number): Point[] {
  const tail = points.slice(-14)
  const n = tail.length
  const mx = (n - 1) / 2
  const my = sum(tail) / n
  const slope =
    tail.reduce((acc, p, i) => acc + (i - mx) * (p.value - my), 0) /
    tail.reduce((acc, _, i) => acc + (i - mx) ** 2, 0)
  const last = points[points.length - 1]
  return Array.from({ length: count }, (_, i) => ({
    t: last.t + (i + 1) * DAY,
    value: Math.round(last.value + slope * (i + 1)),
  }))
}

const sum = (points: Point[]) => points.reduce((acc, p) => acc + p.value, 0)
