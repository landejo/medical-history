import type { LabValue, MedRecord } from '../types'

export interface TrendPoint {
  date: string
  value: number
  recordId: string
  flag?: LabValue['flag']
}

export interface TrendSeries {
  name: string
  unit?: string
  range?: string
  low?: number
  high?: number
  points: TrendPoint[]
}

/** Every numeric lab value that appears on at least `min` records, oldest first. */
export function extractSeries(records: MedRecord[], min = 2): TrendSeries[] {
  const map = new Map<string, TrendSeries>()
  for (const r of records) {
    for (const v of r.values ?? []) {
      const n = typeof v.value === 'number' ? v.value : Number(v.value)
      if (!Number.isFinite(n)) continue
      let s = map.get(v.name)
      if (!s) {
        s = { name: v.name, unit: v.unit, range: v.range, low: v.low, high: v.high, points: [] }
        map.set(v.name, s)
      }
      s.points.push({ date: r.date, value: n, recordId: r.id, flag: v.flag })
    }
  }
  const out = [...map.values()].filter((s) => s.points.length >= min)
  for (const s of out) s.points.sort((a, b) => (a.date < b.date ? -1 : 1))
  return out.sort((a, b) => b.points.length - a.points.length || a.name.localeCompare(b.name))
}

export function isOutOfRange(s: TrendSeries, v: number): boolean {
  return (s.high !== undefined && v > s.high) || (s.low !== undefined && v < s.low)
}
