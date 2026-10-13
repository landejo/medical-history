import { describe, expect, it } from 'vitest'
import type { MedRecord } from '../types'
import { extractSeries, isOutOfRange } from './trends'

const lab = (id: string, date: string, ldl: number, extra: MedRecord['values'] = []): MedRecord => ({
  id, date, type: 'lab', title: 'labs', synopsis: '',
  values: [{ name: 'LDL', value: ldl, unit: 'mg/dL', high: 100, range: '< 100' }, ...extra],
})

describe('extractSeries', () => {
  it('collects numeric values per analyte, oldest first, and drops singletons', () => {
    const series = extractSeries([
      lab('b', '2023-01-01', 119, [{ name: 'A1c', value: 5.3 }]),
      lab('a', '2022-01-01', 142, [{ name: 'Once', value: 1 }]),
      lab('c', '2024-01-01', 'n/a' as unknown as number),
    ])
    expect(series.map((s) => s.name)).toEqual(['LDL'])
    expect(series[0].points.map((p) => p.value)).toEqual([142, 119])
    expect(series[0].unit).toBe('mg/dL')
  })
  it('flags out-of-range values against high/low', () => {
    const [s] = extractSeries([lab('a', '2022-01-01', 142), lab('b', '2023-01-01', 98)])
    expect(isOutOfRange(s, 142)).toBe(true)
    expect(isOutOfRange(s, 98)).toBe(false)
  })
})
