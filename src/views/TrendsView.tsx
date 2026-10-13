import { useMemo, useState } from 'react'
import { useStore } from '../data/store'
import { formatDate } from '../lib/format'
import { hrefFor } from '../lib/router'
import { extractSeries, isOutOfRange, type TrendSeries } from '../lib/trends'

const W = 360, H = 150, PAD = { l: 38, r: 12, t: 12, b: 22 }

function TrendChart({ s }: { s: TrendSeries }) {
  const [hover, setHover] = useState<number | null>(null)
  const xs = s.points.map((p) => Date.parse(p.date))
  const ys = s.points.map((p) => p.value)
  const x0 = Math.min(...xs), x1 = Math.max(...xs)
  const yMin0 = Math.min(...ys, s.low ?? Infinity, s.high ?? Infinity)
  const yMax0 = Math.max(...ys, s.low ?? -Infinity, s.high ?? -Infinity)
  const padY = (yMax0 - yMin0 || 1) * 0.18
  const yMin = Math.max(0, yMin0 - padY), yMax = yMax0 + padY
  const x = (t: number) => PAD.l + (x1 === x0 ? 0.5 : (t - x0) / (x1 - x0)) * (W - PAD.l - PAD.r)
  const y = (v: number) => PAD.t + (1 - (v - yMin) / (yMax - yMin)) * (H - PAD.t - PAD.b)
  const path = s.points.map((p, i) => `${i ? 'L' : 'M'}${x(xs[i]).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const span = yMax - yMin
  const step = span > 40 ? 10 : span > 10 ? 5 : span > 4 ? 1 : span > 1 ? 0.5 : 0.1
  const ticks: number[] = []
  for (let t = Math.ceil(yMin / step) * step; t <= yMax + 1e-9; t += step) ticks.push(Number(t.toFixed(2)))
  const years = [...new Set(s.points.map((p) => p.date.slice(0, 4)))]
  const bandTop = s.high !== undefined ? y(Math.min(s.high, yMax)) : y(yMax)
  const bandBot = s.low !== undefined ? y(Math.max(s.low, yMin)) : y(yMin)
  const latest = s.points[s.points.length - 1]
  const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1))
  return (
    <div className="trend">
      <div className="head">
        <span className="name">{s.name}</span>
        <span className="latest">
          <b className={isOutOfRange(s, latest.value) ? 'out' : ''}>{fmt(latest.value)}</b> {s.unit ?? ''} · {formatDate(latest.date)}
        </span>
      </div>
      {s.range && <div className="ref">Reference {s.range}{s.unit ? ' ' + s.unit : ''} · {s.points.length} results</div>}
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${s.name} over time`}>
        {(s.low !== undefined || s.high !== undefined) && <rect className="band" x={PAD.l} y={bandTop} width={W - PAD.l - PAD.r} height={Math.max(0, bandBot - bandTop)} />}
        <g className="grid">
          {ticks.map((t) => (
            <line key={t} x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} />
          ))}
        </g>
        {ticks.map((t) => (
          <text key={t} className="lbl" x={PAD.l - 6} y={y(t) + 3.5} textAnchor="end">{fmt(t)}</text>
        ))}
        {years.map((yr) => {
          const first = s.points.find((p) => p.date.startsWith(yr))!
          return <text key={yr} className="lbl" x={x(Date.parse(first.date))} y={H - 6} textAnchor="middle">{yr}</text>
        })}
        <path className="line" d={path} />
        {s.points.map((p, i) => (
          <g key={p.recordId + i}>
            <circle className={`pt ${isOutOfRange(s, p.value) ? 'out' : ''}`} cx={x(xs[i])} cy={y(p.value)} r={4.5} />
            <a href={hrefFor({ name: 'timeline', recordId: p.recordId })}>
              <circle className="hit" cx={x(xs[i])} cy={y(p.value)} r={14} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
            </a>
          </g>
        ))}
        {hover !== null && (() => {
          const p = s.points[hover]
          const label = `${fmt(p.value)}${s.unit ? ' ' + s.unit : ''} · ${formatDate(p.date)}`
          const w = label.length * 6.4 + 12
          const px = Math.min(Math.max(x(xs[hover]) - w / 2, PAD.l), W - PAD.r - w)
          const py = y(p.value) - 30 < 0 ? y(p.value) + 14 : y(p.value) - 30
          return (
            <g pointerEvents="none">
              <rect className="tipbox" x={px} y={py} width={w} height={20} rx={3} />
              <text className="tip" x={px + 6} y={py + 14}>{label}</text>
            </g>
          )
        })()}
      </svg>
      <div className="legend">
        <span><i style={{ background: 'var(--accent)' }} />In range</span>
        <span><i style={{ background: 'var(--neg)' }} />Out of range</span>
        {(s.low !== undefined || s.high !== undefined) && <span><i style={{ background: 'color-mix(in srgb, var(--pos) 30%, transparent)', borderRadius: 2 }} />Reference band</span>}
      </div>
    </div>
  )
}

export function TrendsView() {
  const { index } = useStore()
  const series = useMemo(() => extractSeries(index?.records ?? []), [index])
  if (!index) return null
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Trends</h1>
          <p className="lede">Any lab value measured more than once, plotted against its reference range. Click a point to open that record.</p>
        </div>
      </div>
      {series.length === 0 ? (
        <p className="empty">No repeated lab values yet. Trends appear once the same test shows up on two or more records.</p>
      ) : (
        <div className="trend-grid">
          {series.map((s) => (
            <TrendChart key={s.name} s={s} />
          ))}
        </div>
      )}
    </div>
  )
}
