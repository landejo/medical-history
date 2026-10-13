import type { Episode, MedRecord, RecordType, Sentiment } from '../types'

export interface Filters {
  /** Empty set means all types. */
  types: Set<RecordType>
  notableOnly: boolean
  query: string
  /** Body area, e.g. "Left knee". Empty string means all. */
  site: string
}

export const emptyFilters = (): Filters => ({ types: new Set(), notableOnly: false, query: '', site: '' })

/** A record's body areas: its own, else its episode's. */
export function recordSites(r: MedRecord, episodesById: Map<string, Episode>): string[] {
  if (r.sites?.length) return r.sites
  return (r.episode && episodesById.get(r.episode)?.sites) || []
}

/** Every body area that appears in the data, alphabetically, with record counts. */
export function siteCounts(records: MedRecord[], episodes: Episode[]): { site: string; count: number }[] {
  const byId = new Map(episodes.map((e) => [e.id, e]))
  const counts = new Map<string, number>()
  for (const r of records) for (const s of recordSites(r, byId)) counts.set(s, (counts.get(s) ?? 0) + 1)
  return [...counts].map(([site, count]) => ({ site, count })).sort((a, b) => a.site.localeCompare(b.site))
}

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

export function filterRecords(records: MedRecord[], f: Filters, episodes: Episode[] = []): MedRecord[] {
  const byId = new Map(episodes.map((e) => [e.id, e]))
  return records.filter(
    (r) =>
      (f.types.size === 0 || f.types.has(r.type)) &&
      (!f.notableOnly || isNotable(r)) &&
      (!f.site || recordSites(r, byId).includes(f.site)) &&
      matchesQuery(r, f.query),
  )
}

/** Episodes connected to `id` in either direction, with the note from whichever side declared it. */
export function connectedEpisodes(episodes: Episode[], id: string): { episode: Episode; note: string }[] {
  const byId = new Map(episodes.map((e) => [e.id, e]))
  const out = new Map<string, string>()
  for (const rel of byId.get(id)?.related ?? []) out.set(rel.episode, rel.note)
  for (const e of episodes) for (const rel of e.related ?? []) if (rel.episode === id && !out.has(e.id)) out.set(e.id, rel.note)
  return [...out]
    .filter(([eid]) => byId.has(eid))
    .map(([eid, note]) => ({ episode: byId.get(eid)!, note }))
    .sort((a, b) => (a.episode.started < b.episode.started ? -1 : 1))
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
