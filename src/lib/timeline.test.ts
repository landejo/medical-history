import { describe, expect, it } from 'vitest'
import type { Episode, MedRecord } from '../types'
import { buildTimeline, emptyFilters, filterRecords, groupByMonth, headlineSentiment, isNotable, matchesQuery } from './timeline'

const rec = (id: string, date: string, extra: Partial<MedRecord> = {}): MedRecord => ({
  id, date, type: 'visit', title: id, synopsis: 'synopsis ' + id, ...extra,
})
const ep: Episode = { id: 'acl', title: 'ACL', started: '2024-03-01', status: 'resolved', kind: 'injury', summary: '' }

describe('filters', () => {
  const records = [
    rec('a', '2024-01-01', { type: 'lab', findings: [{ text: 'LDL high', sentiment: 'negative' }] }),
    rec('b', '2024-02-01', { type: 'visit', findings: [{ text: 'routine', sentiment: 'neutral' }] }),
    rec('c', '2024-03-01', { type: 'imaging', provider: { facility: 'Pacific Imaging' } }),
  ]
  it('filters by type', () => {
    const f = emptyFilters()
    f.types.add('lab')
    expect(filterRecords(records, f).map((r) => r.id)).toEqual(['a'])
  })
  it('notable only keeps records with non-neutral findings', () => {
    const f = emptyFilters()
    f.notableOnly = true
    expect(filterRecords(records, f).map((r) => r.id)).toEqual(['a'])
    expect(isNotable(records[1])).toBe(false)
  })
  it('search matches title, findings and provider, all words required', () => {
    expect(matchesQuery(records[0], 'ldl')).toBe(true)
    expect(matchesQuery(records[2], 'pacific imaging')).toBe(true)
    expect(matchesQuery(records[2], 'pacific nowhere')).toBe(false)
  })
  it('headline sentiment prefers negative over watch over positive', () => {
    expect(headlineSentiment(rec('x', '2024-01-01', { findings: [{ text: '', sentiment: 'positive' }, { text: '', sentiment: 'watch' }] }))).toBe('watch')
    expect(headlineSentiment(rec('y', '2024-01-01'))).toBeNull()
  })
})

describe('buildTimeline', () => {
  const records = [
    rec('mri', '2024-03-14', { episode: 'acl' }),
    rec('surgery', '2024-04-18', { episode: 'acl' }),
    rec('flu', '2024-10-09'),
    rec('clear', '2024-11-15', { episode: 'acl' }),
    rec('physical', '2023-02-14'),
  ]
  it('collapses episode records into one item placed at the latest record', () => {
    const items = buildTimeline(records, [ep])
    expect(items.map((i) => (i.kind === 'episode' ? `ep:${i.episode.id}` : i.record.id))).toEqual(['ep:acl', 'flu', 'physical'])
    const epItem = items[0]
    if (epItem.kind !== 'episode') throw new Error('expected episode')
    expect(epItem.date).toBe('2024-11-15')
    expect(epItem.records.map((r) => r.id)).toEqual(['clear', 'surgery', 'mri'])
  })
  it('can show every record flat, newest first', () => {
    const items = buildTimeline(records, [ep], false)
    expect(items.map((i) => i.date)).toEqual(['2024-11-15', '2024-10-09', '2024-04-18', '2024-03-14', '2023-02-14'])
  })
  it('groups by month and flags the first group of each year', () => {
    const groups = groupByMonth(buildTimeline(records, [ep], false))
    expect(groups.map((g) => g.key)).toEqual(['2024-11', '2024-10', '2024-04', '2024-03', '2023-02'])
    expect(groups.map((g) => g.firstOfYear)).toEqual([true, false, false, false, true])
  })
})

describe('date precision', () => {
  it('formats month and year precision without inventing a day', async () => {
    const { formatDate, dayParts } = await import('./format')
    expect(formatDate('2007-01-01', 'year')).toBe('2007')
    expect(formatDate('2025-01-01', 'month')).toBe('Jan 2025')
    expect(formatDate('2025-01-07')).toBe('7 Jan 2025')
    expect(dayParts('2007-01-01', 'year')).toEqual({ day: '—', weekday: 'approx' })
  })
})

describe('body areas and connected episodes', () => {
  const eps: Episode[] = [
    { id: 'l-acl', title: 'Left ACL', started: '1996-05-10', status: 'resolved', kind: 'injury', summary: '', sites: ['Left knee'] },
    { id: 'l-oa', title: 'Left OA', started: '2005-06-28', status: 'monitoring', kind: 'condition', summary: '', sites: ['Left knee'], related: [{ episode: 'l-acl', note: 'followed the ACL injuries' }] },
    { id: 'r-oa', title: 'Right OA', started: '2005-06-28', status: 'monitoring', kind: 'condition', summary: '', sites: ['Right knee'] },
  ]
  const recs = [
    rec('a', '1996-05-10', { episode: 'l-acl' }),
    rec('b', '2024-09-25', { episode: 'l-oa' }),
    rec('c', '2024-07-10', { episode: 'r-oa' }),
    rec('d', '2024-03-19', { sites: ['Left knee', 'Right knee'] }),
    rec('e', '2019-02-13'),
  ]
  it('filters by body area using record sites, falling back to the episode', async () => {
    const { filterRecords, siteCounts } = await import('./timeline')
    const f = { ...emptyFilters(), site: 'Left knee' }
    expect(filterRecords(recs, f, eps).map((r) => r.id)).toEqual(['a', 'b', 'd'])
    expect(siteCounts(recs, eps)).toEqual([{ site: 'Left knee', count: 3 }, { site: 'Right knee', count: 2 }])
  })
  it('finds connected episodes from either side', async () => {
    const { connectedEpisodes } = await import('./timeline')
    expect(connectedEpisodes(eps, 'l-acl').map((c) => [c.episode.id, c.note])).toEqual([['l-oa', 'followed the ACL injuries']])
    expect(connectedEpisodes(eps, 'l-oa').map((c) => c.episode.id)).toEqual(['l-acl'])
    expect(connectedEpisodes(eps, 'r-oa')).toEqual([])
  })
})
