import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { area, curveMonotoneX, line } from "d3-shape"

import type { Point } from "@/lib/data"

type Props = {
  points: Point[]
  forecast?: Point[]
  label: string
  format: (value: number) => string
  formatTime: (t: number) => string
  height?: number
  color?: string
}

const PAD = { top: 16, right: 16, bottom: 28, left: 52 }

/**
 * Bold monotone line chart. Pointer scrubbing is coalesced into one frame;
 * ←/→/Home/End step through points while the chart has focus. The tooltip
 * follows the inspected point on the line.
 */
export function LineChart({
  points,
  forecast = [],
  label,
  format,
  formatTime,
  height = 280,
  color = "var(--chart-1)",
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [inspect, setInspect] = useState<number | null>(null)
  const [drawn, setDrawn] = useState(false)
  const gradientId = useId()
  const frame = useRef(0)

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.round(entry.contentRect.width))
    )
    observer.observe(el)
    setWidth(el.clientWidth)
    return () => observer.disconnect()
  }, [])

  // The draw-in animation runs once, on first paint with a real width.
  useEffect(() => {
    if (width && !drawn) {
      const id = requestAnimationFrame(() => setDrawn(true))
      return () => cancelAnimationFrame(id)
    }
  }, [width, drawn])

  const all = useMemo(() => [...points, ...forecast], [points, forecast])
  const geo = useMemo(() => {
    if (!width || all.length < 2) return null
    const t0 = all[0].t
    const t1 = all[all.length - 1].t
    const values = all.map((p) => p.value)
    const [lo, hi] = niceRange(Math.min(...values), Math.max(...values))
    const x = (t: number) =>
      PAD.left + ((t - t0) / (t1 - t0)) * (width - PAD.left - PAD.right)
    const y = (v: number) =>
      PAD.top + (1 - (v - lo) / (hi - lo)) * (height - PAD.top - PAD.bottom)
    const ticks = Array.from({ length: 4 }, (_, i) => lo + ((hi - lo) * i) / 3)
    const xTicks = pickTicks(all, Math.max(2, Math.floor(width / 110)))
    const path =
      line<Point>()
        .x((p) => x(p.t))
        .y((p) => y(p.value))
        .curve(curveMonotoneX)(points) ?? ""
    const fill =
      area<Point>()
        .x((p) => x(p.t))
        .y0(height - PAD.bottom)
        .y1((p) => y(p.value))
        .curve(curveMonotoneX)(points) ?? ""
    return { x, y, ticks, xTicks, path, fill }
  }, [all, points, width, height])

  const index = inspect === null ? null : Math.min(inspect, all.length - 1)
  const active = index === null ? null : all[index]
  const isForecast = index !== null && index >= points.length

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const px = event.clientX - rect.left
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      if (!geo) return
      let best = 0
      for (let i = 1; i < all.length; i++) {
        if (Math.abs(geo.x(all[i].t) - px) < Math.abs(geo.x(all[best].t) - px))
          best = i
      }
      setInspect(best)
    })
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    const last = all.length - 1
    const current = index ?? last
    const next = {
      ArrowLeft: current - 1,
      ArrowRight: current + 1,
      Home: 0,
      End: last,
    }[event.key]
    if (next === undefined) return
    event.preventDefault()
    setInspect(Math.max(0, Math.min(last, next)))
  }

  return (
    <div
      ref={wrapRef}
      className="relative w-full select-none"
      style={{ height }}
    >
      {geo && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={label}
          tabIndex={0}
          className="block touch-pan-y rounded-md"
          onPointerMove={onPointerMove}
          onPointerLeave={() => {
            cancelAnimationFrame(frame.current)
            setInspect(null)
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setInspect(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.18} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {geo.ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={geo.y(tick)}
                y2={geo.y(tick)}
                stroke="var(--border)"
              />
              <text
                x={PAD.left - 10}
                y={geo.y(tick)}
                dy="0.32em"
                textAnchor="end"
                className="fill-muted-foreground font-mono text-[11px]"
              >
                {compact(tick)}
              </text>
            </g>
          ))}
          {geo.xTicks.map((p, i) => (
            <text
              key={p.t}
              x={geo.x(p.t)}
              y={height - 8}
              textAnchor={
                i === 0
                  ? "start"
                  : i === geo.xTicks.length - 1
                    ? "end"
                    : "middle"
              }
              className="fill-muted-foreground font-mono text-[11px]"
            >
              {formatTime(p.t)}
            </text>
          ))}
          <path
            d={geo.fill}
            fill={`url(#${gradientId})`}
            className={`transition-opacity duration-500 ${drawn ? "opacity-100" : "opacity-0"}`}
          />
          <path
            d={geo.path}
            fill="none"
            stroke={color}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray="1 1"
            strokeDashoffset={drawn ? 0 : 1}
            style={{ transition: "stroke-dashoffset 900ms var(--ease-out)" }}
          />
          {forecast.map((p) => (
            <circle
              key={p.t}
              cx={geo.x(p.t)}
              cy={geo.y(p.value)}
              r={2.5}
              fill={color}
              opacity={0.7}
            />
          ))}
          {active && (
            <g pointerEvents="none">
              <line
                x1={geo.x(active.t)}
                x2={geo.x(active.t)}
                y1={PAD.top}
                y2={height - PAD.bottom}
                stroke="var(--muted-foreground)"
                strokeDasharray="3 3"
              />
              <circle
                cx={geo.x(active.t)}
                cy={geo.y(active.value)}
                r={6}
                fill={color}
                stroke="var(--card)"
                strokeWidth={3}
              />
            </g>
          )}
        </svg>
      )}
      {geo && active && (
        <div
          role="status"
          className="pointer-events-none absolute z-10 min-w-28 rounded-md border bg-popover px-2.5 py-1.5 shadow-lg"
          style={{
            left: Math.min(Math.max(geo.x(active.t), 64), width - 64),
            top: geo.y(active.value),
            transform: `translate(-50%, ${geo.y(active.value) < 70 ? "16px" : "calc(-100% - 16px)"})`,
          }}
        >
          <div className="text-xs text-muted-foreground">
            {formatTime(active.t)}
            {isForecast && " · projected"}
          </div>
          <div className="tabular font-mono text-sm font-medium">
            {format(active.value)}
          </div>
        </div>
      )}
    </div>
  )
}

function niceRange(min: number, max: number): [number, number] {
  const span = max - min || 1
  const step = 10 ** Math.floor(Math.log10(span / 3))
  return [
    Math.floor((min - span * 0.08) / step) * step,
    Math.ceil((max + span * 0.08) / step) * step,
  ]
}

function pickTicks(points: Point[], count: number) {
  if (points.length <= count) return points
  const step = (points.length - 1) / (count - 1)
  return Array.from({ length: count }, (_, i) => points[Math.round(i * step)])
}

function compact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
}
