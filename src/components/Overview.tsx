import { useEffect, useMemo, useState } from 'react'
import type { Episode, MedRecord } from '../types'
import { formatDate, formatRange } from '../lib/format'
import { buildLanes, domain, toTime, yearTicks } from '../lib/overview'
import { hrefFor } from '../lib/router'
import { headlineSentiment } from '../lib/timeline'

const LANE_H = 30
const AXIS_H = 26
const PAD_X = 10

interface Tip {
  x: number
  y: number
  record: MedRecord
}

/** Scrolls the timeline list to the newest month section on or before `iso`. */
function jumpTo(iso: string) {
  const key = iso.slice(0, 7)
  const sections = [...document.querySelectorAll<HTMLElement>('.tl-month[id^="m-"]')]
  const target = sections.find((s) => s.id.slice(2) <= key) ?? sections[sections.length - 1]
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  target?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}

/**
 * Horizontal overview: one lane per episode across the years, records as dots colored by their most
 * notable finding. Complements the vertical list, which stays the place to read records.
 */
export function Overview({ records, episodes, today, activeId, layoutKey }: { records: MedRecord[]; episodes: Episode[]; today: string; activeId?: string; layoutKey?: string }) {
  const lanes = useMemo(() => buildLanes(records, episodes, today), [records, episodes, today])
  const { from, to } = useMemo(() => domain(lanes, today), [lanes, today])
  const ticks = useMemo(() => yearTicks(from, to), [from, to])
  // A callback ref, so the observer attaches whenever the track element (re)appears.
  const [trackEl, setTrackEl] = useState<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(600)
  const [tip, setTip] = useState<Tip | null>(null)

  useEffect(() => {
    if (!trackEl) return
    const measure = () => setWidth(Math.max(200, trackEl.clientWidth))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(trackEl)
    return () => ro.disconnect()
  }, [trackEl])

  // Display settings change the page width; re-measure after layout settles.
  useEffect(() => {
    if (!trackEl) return
    const id = setTimeout(() => setWidth(Math.max(200, trackEl.clientWidth)), 0)
    return () => clearTimeout(id)
  }, [trackEl, layoutKey])

  if (!lanes.length) return null
  const t0 = toTime(from)
  const t1 = toTime(to)
  const x = (iso: string) => PAD_X + ((toTime(iso) - t0) / (t1 - t0 || 1)) * (width - PAD_X * 2)
  const height = lanes.length * LANE_H + AXIS_H

  const onTrackClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as Element).closest('a')) return
    const rect = e.currentTarget.getBoundingClientRect()
    const frac = (e.clientX - rect.left - PAD_X) / (rect.width - PAD_X * 2)
    const iso = new Date(t0 + Math.max(0, Math.min(1, frac)) * (t1 - t0)).toISOString().slice(0, 10)
    jumpTo(iso)
  }

  return (
    <section className="overview" aria-label="Overview by episode">
      <div className="ov-grid" style={{ gridTemplateRows: `repeat(${lanes.length}, ${LANE_H}px) ${AXIS_H}px` }}>
        <div className="ov-labels">
          {lanes.map((l) =>
            l.episode ? (
              <a key={l.key} className="ov-label" href={hrefFor({ name: 'episodes', episodeId: l.key })} title={`${l.label} · ${formatRange(l.start!, l.ongoing ? undefined : l.end, l.episode.startedPrecision)}`}>
                {l.label}
              </a>
            ) : (
              <span key={l.key} className="ov-label other">{l.label}</span>
            ),
          )}
        </div>
        <div className="ov-track" ref={setTrackEl}>
          <svg width={width} height={height} onClick={onTrackClick} role="img" aria-label="Records by episode over time. Click a year to jump to it in the list.">
            {ticks.map((y) => {
              const tx = x(`${y}-01-01`)
              return (
                <g key={y}>
                  <line className="ov-grid-line" x1={tx} x2={tx} y1={0} y2={lanes.length * LANE_H} />
                  <text className="ov-tick" x={tx} y={lanes.length * LANE_H + 17} textAnchor="middle">{y}</text>
                </g>
              )
            })}
            {lanes.map((l, i) => {
              const cy = i * LANE_H + LANE_H / 2
              return (
                <g key={l.key}>
                  {l.start && l.end && (
                    <rect className={`ov-bar ${l.ongoing ? 'ongoing' : ''}`} x={x(l.start)} y={cy - 3} width={Math.max(4, x(l.end) - x(l.start))} height={6} rx={3} />
                  )}
                  {l.records.map((r) => {
                    const s = headlineSentiment(r) ?? 'neutral'
                    const cx = x(r.date)
                    return (
                      <a key={r.id} href={hrefFor({ name: 'timeline', recordId: r.id })} aria-label={`${formatDate(r.date, r.datePrecision)}: ${r.title}`}>
                        <circle className={`ov-dot ${s} ${r.id === activeId ? 'active' : ''}`} cx={cx} cy={cy} r={5} />
                        <circle
                          className="ov-hit"
                          cx={cx}
                          cy={cy}
                          r={11}
                          onMouseEnter={() => setTip({ x: cx, y: cy, record: r })}
                          onMouseLeave={() => setTip((t) => (t?.record.id === r.id ? null : t))}
                          onFocus={() => setTip({ x: cx, y: cy, record: r })}
                          onBlur={() => setTip(null)}
                        />
                      </a>
                    )
                  })}
                </g>
              )
            })}
          </svg>
          {tip && (
            <div className="ov-tip" style={{ left: Math.min(Math.max(tip.x, 110), width - 110), top: tip.y + 14 }}>
              <div className="mono muted">{formatDate(tip.record.date, tip.record.datePrecision)}</div>
              <div className="t">{tip.record.title}</div>
              {tip.record.findings?.find((f) => f.sentiment !== 'neutral') && (
                <div className="f">{tip.record.findings.find((f) => f.sentiment !== 'neutral')!.text}</div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="ov-legend">
        <span><i className="negative" />Concern</span>
        <span><i className="watch" />Worth watching</span>
        <span><i className="positive" />Good news</span>
        <span><i className="neutral" />No flagged finding</span>
        <span><b className="bar" />Episode span</span>
        <span className="muted">Click a year to jump to it below</span>
      </div>
    </section>
  )
}
