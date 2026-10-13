import { describe, expect, it } from 'vitest'
import type { Episode, MedRecord } from '../types'
import { buildLanes, domain, yearTicks } from './overview'

const rec = (id: string, date: string, episode?: string): MedRecord => ({ id, date, type: 'visit', title: id, synopsis: '', ...(episode ? { episode } : {}) })
const ep = (id: string, started: string, status: Episode['status'], ended?: string): Episode => ({ id, title: id.toUpperCase(), started, status, kind: 'condition', summary: '', ...(ended ? { ended } : {}) })

describe('buildLanes', () => {
  const eps = [ep('acl', '1996-05-10', 'resolved', '1996-05-10'), ep('oa', '2005-06-28', 'monitoring'), ep('empty', '2024-07-10', 'monitoring')]
  const recs = [rec('a', '1996-05-10', 'acl'), rec('b', '2005-06-28', 'oa'), rec('c', '2024-09-25', 'oa'), rec('x', '2019-02-13')]
  const lanes = buildLanes(recs, eps, '2026-10-13')
  it('makes a lane per episode with records, newest activity first, then Other', () => {
    expect(lanes.map((l) => l.key)).toEqual(['oa', 'acl', 'other'])
  })
  it('runs ongoing episodes to today and resolved ones to their last record or end date', () => {
    expect(lanes[0]).toMatchObject({ start: '2005-06-28', end: '2026-10-13', ongoing: true })
    expect(lanes[1]).toMatchObject({ start: '1996-05-10', end: '1996-05-10', ongoing: false })
  })
  it('computes a domain from the first January to today, and sensible ticks', () => {
    expect(domain(lanes, '2026-10-13')).toEqual({ from: '1996-01-01', to: '2026-10-13' })
    expect(yearTicks('1988-01-01', '2026-10-13')).toEqual([1990, 1995, 2000, 2005, 2010, 2015, 2020, 2025])
    expect(yearTicks('2019-01-01', '2026-10-13')).toEqual([2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026])
  })
})
