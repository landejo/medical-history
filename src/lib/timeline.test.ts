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
