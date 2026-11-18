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
  color?: string
}

/** What the crosshair shows: a recorded sample, or a value on the projection line. */
type Inspected = { t: number; value: number; projected: boolean }

const PAD = { top: 16, right: 16, bottom: 28, left: 52 }
const GLIDE = "140ms var(--ease-out)"

/**
 * Bold monotone line chart, scrubbed like prox: pointer moves are coalesced
 * into one frame, the crosshair and tooltip glide between positions (they
 * only fade when they first appear), recorded history snaps to the nearest
 * real sample and the projection is a dotted line the pointer glides along.
 * ←/→/Home/End step through the samples while the chart has focus.
 */
export function LineChart({
  points,
  forecast = [],
  label,
  format,
  formatTime,
  color = "var(--chart-1)",
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  // The last reading stays rendered while the crosshair fades out, so it doesn't jump on exit.
  const [reading, setReading] = useState<Inspected | null>(null)
  const [active, setActive] = useState(false)
  // Off for the frame the crosshair appears, so it fades in place instead of sliding in.
  const [glide, setGlide] = useState(false)
  const [tip, setTip] = useState({ w: 0, h: 0 })
  const [drawn, setDrawn] = useState(false)
  const gradientId = useId()
  const frame = useRef(0)
  const pointerX = useRef(0)
  const activeRef = useRef(false)
  const glideFrame = useRef(0)
  const height = width && width < 560 ? 200 : 240

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

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current)
      cancelAnimationFrame(glideFrame.current)
    },
    []
  )

  // Measure the tooltip after its text changes so it can sit beside the point.
  useLayoutEffect(() => {
    const el = tipRef.current
    if (el && (el.offsetWidth !== tip.w || el.offsetHeight !== tip.h))
      setTip({ w: el.offsetWidth, h: el.offsetHeight })
  }, [reading, tip])

  const all = useMemo(() => [...points, ...forecast], [points, forecast])
  // The projection starts at the last recorded sample so the dotted line connects.
  const projection = useMemo(
    () =>
      forecast.length && points.length ? [points.at(-1)!, ...forecast] : [],
    [points, forecast]
  )

  const geo = useMemo(() => {
    if (!width || all.length < 2) return null
    const t0 = all[0].t
    const t1 = all[all.length - 1].t
    const values = all.map((p) => p.value)
    const [lo, hi] = niceRange(Math.min(...values), Math.max(...values))
    const x = (t: number) =>
      PAD.left + ((t - t0) / (t1 - t0)) * (width - PAD.left - PAD.right)
    const tAt = (px: number) =>
      t0 + ((px - PAD.left) / (width - PAD.left - PAD.right)) * (t1 - t0)
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
    // Straight segments, so a value read off the projection matches what is drawn.
    const projected =
      line<Point>()
        .x((p) => x(p.t))
        .y((p) => y(p.value))(projection) ?? ""
    return { x, tAt, y, ticks, xTicks, path, fill, projected }
  }, [all, points, projection, width, height])

  /** Recorded history snaps to the nearest sample; the projection interpolates. */
  const seriesAt = (t: number): Inspected => {
    const first = all[0].t
    const last = all[all.length - 1].t
    t = Math.min(last, Math.max(first, t))
    if (projection.length > 1 && t > projection[0].t) {
      const i = Math.max(
        1,
        projection.findIndex((p) => p.t >= t)
      )
      const a = projection[i - 1]
      const b = projection[i]
      const k = (t - a.t) / (b.t - a.t || 1)
      return { t, value: a.value + (b.value - a.value) * k, projected: true }
    }
    const nearest = points.reduce((a, b) =>
      Math.abs(a.t - t) < Math.abs(b.t - t) ? a : b
    )
    return { ...nearest, projected: false }
  }

  const scrub = (event: React.PointerEvent<SVGSVGElement>) => {
    pointerX.current =
      event.clientX - event.currentTarget.getBoundingClientRect().left
    if (frame.current) return
    frame.current = requestAnimationFrame(() => {
      frame.current = 0
      if (geo) show(seriesAt(geo.tAt(pointerX.current)))
    })
  }

  const show = (next: Inspected) => {
    setReading(next)
    if (activeRef.current) return
    activeRef.current = true
    setActive(true)
    setGlide(false)
    cancelAnimationFrame(glideFrame.current)
    glideFrame.current = requestAnimationFrame(() => setGlide(true))
  }

  const clear = () => {
    cancelAnimationFrame(frame.current)
    cancelAnimationFrame(glideFrame.current)
    frame.current = 0
    activeRef.current = false
    setActive(false)
    setGlide(false)
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    const last = all.length - 1
    const t = active ? reading?.t : undefined
    const current =
      t === undefined
        ? last
        : all.reduce(
            (best, p, i) =>
              Math.abs(p.t - t) < Math.abs(all[best].t - t) ? i : best,
            0
          )
    const next = {
      ArrowLeft: current - 1,
      ArrowRight: current + 1,
      Home: 0,
      End: last,
    }[event.key]
    if (next === undefined) return
    event.preventDefault()
    const i = Math.max(0, Math.min(last, next))
    show({ ...all[i], projected: i >= points.length })
  }

  const shown = reading

  let px = 0
  let py = 0
  let tipX = 0
  let tipY = 0
  if (geo && shown) {
    px = geo.x(shown.t)
    py = geo.y(shown.value)
    // Beside the point: above-right when there is room, flipped near the edges.
    tipX = px + 16
    tipY = py - tip.h - 12
    if (tipX + tip.w > width) tipX = px - 16 - tip.w
    if (tipY < 0) tipY = py + 12
    tipX = Math.max(0, tipX)
  }
  const motion = glide ? GLIDE : "0s"

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
          onPointerMove={scrub}
          onPointerDown={scrub}
          onPointerLeave={(event) => {
            // A tap keeps its reading; a mouse leaving the chart clears it.
            if (event.pointerType === "mouse") clear()
          }}
          onKeyDown={onKeyDown}
          onBlur={clear}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.16} />
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
          {geo.projected && (
            <path
              d={geo.projected}
              fill="none"
              stroke={color}
              strokeOpacity={0.7}
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray="0 10"
              className={`transition-opacity duration-500 ${drawn ? "opacity-100" : "opacity-0"}`}
            />
          )}
          <g
            pointerEvents="none"
            style={{
              opacity: active ? 1 : 0,
              transition: "opacity 150ms ease",
            }}
          >
            <line
              x1={0}
              x2={0}
              y1={PAD.top}
              y2={height - PAD.bottom}
              stroke="rgb(255 255 255 / 20%)"
              style={{
                transform: `translateX(${px}px)`,
                transition: `transform ${motion}`,
              }}
            />
            <g
              style={{
                transform: `translate(${px}px, ${py}px)`,
                transition: `transform ${motion}`,
              }}
            >
              <circle r={12} fill={color} opacity={0.2} />
              <circle r={6} fill={color} stroke="var(--card)" strokeWidth={3} />
            </g>
          </g>
        </svg>
      )}
      <div
        ref={tipRef}
        role="status"
        className="pointer-events-none absolute top-0 left-0 z-10 grid min-w-34 gap-1 rounded-md border bg-background px-2.5 py-1.5 text-xs shadow-[0_8px_24px_rgb(0_0_0/40%)] will-change-transform"
        style={{
          transform: `translate3d(${tipX}px, ${tipY}px, 0)`,
          opacity: active ? 1 : 0,
          visibility: active ? "visible" : "hidden",
          transition: active
            ? `transform ${motion}, opacity 150ms ease`
            : "opacity 150ms ease, visibility 0s 150ms",
        }}
      >
        {shown && (
          <>
            <div className="font-medium">{formatTime(shown.t)}</div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <i
                className="size-2.5 shrink-0 rounded-[2px]"
                style={
                  shown.projected
                    ? { border: `1.5px dashed ${color}` }
                    : { background: color }
                }
              />
              <span>{shown.projected ? "Projected" : "Recorded"}</span>
              <strong className="tabular ml-auto pl-4 font-mono font-medium text-foreground">
                {format(shown.value)}
              </strong>
            </div>
          </>
        )}
      </div>
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
