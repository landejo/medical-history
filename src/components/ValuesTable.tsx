import type { LabValue } from '../types'

function RangeBar({ v }: { v: LabValue }) {
  const n = typeof v.value === 'number' ? v.value : Number(v.value)
  if (!Number.isFinite(n) || (v.low === undefined && v.high === undefined)) return null
  // Scale: the reference range sits in the middle 60% of the bar.
  const lo = v.low ?? (v.high !== undefined ? Math.min(0, v.high) : 0)
  const hi = v.high ?? (v.low !== undefined ? v.low * 2 : n)
  const span = Math.max(hi - lo, 1e-9)
  const min = lo - span * 0.33, max = hi + span * 0.33
  const pct = (x: number) => Math.max(0, Math.min(100, ((x - min) / (max - min)) * 100))
  const out = (v.high !== undefined && n > v.high) || (v.low !== undefined && n < v.low)
  return (
    <div className="rangebar" aria-hidden>
      <div className="ok" style={{ left: `${pct(lo)}%`, width: `${pct(hi) - pct(lo)}%` }} />
      <div className={`pt ${out ? 'out' : ''}`} style={{ left: `${pct(n)}%` }} />
    </div>
  )
}

export function ValuesTable({ values }: { values: LabValue[] }) {
  return (
    <table className="values">
      <thead>
        <tr>
          <th>Test</th>
          <th>Result</th>
          <th>Reference</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {values.map((v, i) => (
          <tr key={i}>
            <td>{v.name}</td>
            <td className="num">
              {v.value}
              {v.unit && <span className="unit">{v.unit}</span>}
              {v.flag && v.flag !== 'normal' && (
                <>
                  {' '}
                  <span className={`flag ${v.flag}`}>{v.flag}</span>
                </>
              )}
            </td>
            <td className="ref">{v.range ?? ''}</td>
            <td>
              <RangeBar v={v} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
