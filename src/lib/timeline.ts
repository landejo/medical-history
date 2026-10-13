import type { Episode, MedRecord, RecordType, Sentiment } from '../types'

export interface Filters {
  /** Empty set means all types. */
  types: Set<RecordType>
  notableOnly: boolean
  query: string
}

export const emptyFilters = (): Filters => ({ types: new Set(), notableOnly: false, query: '' })

export function isNotable(r: MedRecord): boolean {
  return (r.findings ?? []).some((f) => f.sentiment !== 'neutral')
}

/** The single most important sentiment on a record, for the timeline marker. */
export function headlineSentiment(r: MedRecord): Sentiment | null {
  const s = new Set((r.findings ?? []).map((f) => f.sentiment))
  if (s.has('negative')) return 'negative'
  if (s.has('watch')) return 'watch'
  if (s.has('positive')) return 'positive'
  return null
}

export function matchesQuery(r: MedRecord, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const hay = [
    r.title,
    r.synopsis,
    r.provider?.name,
    r.provider?.specialty,
    r.provider?.facility,
    ...(r.tags ?? []),
    ...(r.findings ?? []).map((f) => f.text),
    ...(r.values ?? []).map((v) => v.name),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return q.split(/\s+/).every((word) => hay.includes(word))
}

export function filterRecords(records: MedRecord[], f: Filters): MedRecord[] {
  return records.filter(
    (r) => (f.types.size === 0 || f.types.has(r.type)) && (!f.notableOnly || isNotable(r)) && matchesQuery(r, f.query),
  )
}

export type TimelineItem =
  | { kind: 'record'; date: string; record: MedRecord }
  | { kind: 'episode'; date: string; episode: Episode; records: MedRecord[] }

const byDateDesc = <T extends { date: string }>(a: T, b: T) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)

/**
 * Collapses records that belong to an episode into one episode item, positioned at the episode's
 * most recent (matching) record, so an active episode stays near the top of the timeline.
 */
export function buildTimeline(records: MedRecord[], episodes: Episode[], collapseEpisodes = true): TimelineItem[] {
  const byId = new Map(episodes.map((e) => [e.id, e]))
  const grouped = new Map<string, MedRecord[]>()
  const items: TimelineItem[] = []
  for (const r of records) {
    const ep = r.episode ? byId.get(r.episode) : undefined
    if (collapseEpisodes && ep) {
      if (!grouped.has(ep.id)) grouped.set(ep.id, [])
      grouped.get(ep.id)!.push(r)
    } else {
      items.push({ kind: 'record', date: r.date, record: r })
    }
  }
  for (const [id, recs] of grouped) {
    recs.sort(byDateDesc)
    items.push({ kind: 'episode', date: recs[0].date, episode: byId.get(id)!, records: recs })
  }
  return items.sort(byDateDesc)
}

export interface MonthGroup {
  key: string // YYYY-MM
  year: number
  firstOfYear: boolean
  items: TimelineItem[]
}

export function groupByMonth(items: TimelineItem[]): MonthGroup[] {
  const groups: MonthGroup[] = []
  let lastYear = -1
  for (const item of items) {
    const key = item.date.slice(0, 7)
    const year = Number(key.slice(0, 4))
    let g = groups[groups.length - 1]
    if (!g || g.key !== key) {
      g = { key, year, firstOfYear: year !== lastYear, items: [] }
      groups.push(g)
      lastYear = year
    }
    g.items.push(item)
  }
  return groups
}

export function countByType(records: MedRecord[]): Map<RecordType, number> {
  const m = new Map<RecordType, number>()
  for (const r of records) m.set(r.type, (m.get(r.type) ?? 0) + 1)
  return m
}

export function recordsForEpisode(records: MedRecord[], episodeId: string): MedRecord[] {
  return records.filter((r) => r.episode === episodeId).sort(byDateDesc)
}
