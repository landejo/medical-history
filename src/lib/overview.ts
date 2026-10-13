import type { Episode, MedRecord } from '../types'

export interface Lane {
  key: string
  label: string
  episode?: Episode
  /** Bar span (episode lanes only). */
  start?: string
  end?: string
  ongoing: boolean
  records: MedRecord[]
}

/**
 * One lane per episode that has at least one of the given records, plus an "Other records" lane
 * for records outside any episode. Lanes are ordered by their most recent record, newest first.
 */
export function buildLanes(records: MedRecord[], episodes: Episode[], today: string): Lane[] {
  const byId = new Map(episodes.map((e) => [e.id, e]))
  const grouped = new Map<string, MedRecord[]>()
  const other: MedRecord[] = []
  for (const r of records) {
    if (r.episode && byId.has(r.episode)) {
      if (!grouped.has(r.episode)) grouped.set(r.episode, [])
      grouped.get(r.episode)!.push(r)
    } else other.push(r)
  }
  const asc = (a: MedRecord, b: MedRecord) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)
  const lanes: Lane[] = [...grouped].map(([id, recs]) => {
    const e = byId.get(id)!
    recs.sort(asc)
    const first = recs[0].date
    const last = recs[recs.length - 1].date
    const ongoing = e.status !== 'resolved'
    return {
      key: id,
      label: e.title,
      episode: e,
      start: e.started < first ? e.started : first,
      end: ongoing ? today : e.ended && e.ended > last ? e.ended : last,
      ongoing,
      records: recs,
    }
  })
  const latest = (l: Lane) => l.records[l.records.length - 1].date
  lanes.sort((a, b) => (latest(a) < latest(b) ? 1 : -1))
  if (other.length) lanes.push({ key: 'other', label: 'Other records', ongoing: false, records: other.sort(asc) })
  return lanes
}

/** Domain from the first January on or before the earliest date to `today`. */
export function domain(lanes: Lane[], today: string): { from: string; to: string } {
  let min = today
  for (const l of lanes) {
    if (l.start && l.start < min) min = l.start
    for (const r of l.records) if (r.date < min) min = r.date
  }
  return { from: `${min.slice(0, 4)}-01-01`, to: today }
}

/** Year tick values for a span, at 1, 2 or 5 year steps. */
export function yearTicks(from: string, to: string): number[] {
  const a = Number(from.slice(0, 4))
  const b = Number(to.slice(0, 4))
  const span = b - a
  const step = span > 20 ? 5 : span > 8 ? 2 : 1
  const out: number[] = []
  for (let y = Math.ceil(a / step) * step; y <= b; y += step) out.push(y)
  return out
}

export const toTime = (iso: string) => Date.parse(iso + 'T00:00:00Z')
