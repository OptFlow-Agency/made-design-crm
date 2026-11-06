'use client'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import type { Day } from './queries'

type Metric = 'revenue' | 'orders'
const H = 232
const PAD = { top: 12, right: 12, bottom: 28, left: 44 }

const niceMax = (max: number) => {
  if (max <= 0) return 4
  const pow = 10 ** Math.floor(Math.log10(max))
  const n = max / pow
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow
}
const dateLabel = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const longDate = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' })

export const SalesChart: React.FC<{ series: Day[]; currency: string }> = ({ series, currency }) => {
  const [metric, setMetric] = useState<Metric>('revenue')
  const [hover, setHover] = useState<number | null>(null)
  const [width, setWidth] = useState(640)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!box.current) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, Math.floor(e.contentRect.width))))
    ro.observe(box.current)
    return () => ro.disconnect()
  }, [])

  const money = useMemo(() => new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }), [currency])
  const compact = useMemo(() => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }), [])
  const fmt = (v: number) => (metric === 'revenue' ? money.format(v) : String(v))

  const values = series.map((d) => d[metric])
  const top = niceMax(Math.max(...values, 0))
  const innerW = width - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const x = (i: number) => PAD.left + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW)
  const y = (v: number) => PAD.top + innerH - (v / top) * innerH
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const area = `${line}L${x(values.length - 1).toFixed(1)},${PAD.top + innerH}L${x(0).toFixed(1)},${PAD.top + innerH}Z`
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * top)
  const every = Math.ceil(series.length / Math.max(2, Math.floor(innerW / 76)))
  const total = values.reduce((a, b) => a + b, 0)

  const pick = (clientX: number) => {
    const rect = box.current!.getBoundingClientRect()
    const rel = clientX - rect.left - PAD.left
    setHover(Math.min(series.length - 1, Math.max(0, Math.round((rel / innerW) * (series.length - 1)))))
  }
  const shown = hover != null ? series[hover] : null

  return (
    <div className="ds-chart">
      <div className="ds-chart__bar">
        <div className="ds-seg" role="group" aria-label="Chart metric">
          {(['revenue', 'orders'] as const).map((m) => (
            <button key={m} type="button" aria-pressed={metric === m} onClick={() => setMetric(m)}>{m === 'revenue' ? 'Revenue' : 'Orders'}</button>
          ))}
        </div>
        <p className="ds-chart__total"><strong>{fmt(total)}</strong> <span>in this period</span></p>
      </div>

      <div
        ref={box}
        className="ds-chart__plot"
        tabIndex={0}
        role="img"
        aria-label={`${metric === 'revenue' ? 'Revenue' : 'Orders'} per day, ${fmt(total)} in total. Use the arrow keys to read each day.`}
        onPointerMove={(e) => pick(e.clientX)}
        onPointerLeave={() => setHover(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') { e.preventDefault(); setHover((h) => Math.min(series.length - 1, (h ?? -1) + 1)) }
          if (e.key === 'ArrowLeft') { e.preventDefault(); setHover((h) => Math.max(0, (h ?? series.length) - 1)) }
          if (e.key === 'Escape') setHover(null)
        }}
        onBlur={() => setHover(null)}
      >
        <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`} aria-hidden>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} className="ds-chart__grid" />
              <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" className="ds-chart__axis">{metric === 'revenue' ? compact.format(t) : Math.round(t)}</text>
            </g>
          ))}
          {series.map((d, i) => (i % every === 0 || i === series.length - 1) && (series.length - 1 - i === 0 || series.length - 1 - i >= every / 2) ? (
            <text key={d.date} x={x(i)} y={H - 8} textAnchor="middle" className="ds-chart__axis">{dateLabel.format(new Date(d.date))}</text>
          ) : null)}
          <path d={area} className="ds-chart__area" />
          <path d={line} className="ds-chart__line" />
          {hover != null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} className="ds-chart__cursor" />
              <circle cx={x(hover)} cy={y(values[hover])} r={4} className="ds-chart__dot" />
            </g>
          )}
        </svg>
        {shown && hover != null && (
          <div className="ds-chart__tip" style={{ left: Math.min(Math.max(x(hover), 70), width - 70) }} role="status">
            <span>{longDate.format(new Date(shown.date))}</span>
            <strong>{fmt(shown[metric])}</strong>
            {metric === 'revenue' ? <span>{shown.orders} {shown.orders === 1 ? 'order' : 'orders'}</span> : <span>{money.format(shown.revenue)}</span>}
          </div>
        )}
      </div>

      <table className="visually-hidden">
        <caption>Daily revenue and orders</caption>
        <thead><tr><th>Date</th><th>Revenue</th><th>Orders</th></tr></thead>
        <tbody>{series.map((d) => <tr key={d.date}><td>{d.date}</td><td>{money.format(d.revenue)}</td><td>{d.orders}</td></tr>)}</tbody>
      </table>
    </div>
  )
}
