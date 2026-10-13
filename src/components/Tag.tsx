import type { EpisodeStatus, Finding, RecordType } from '../types'
import { RECORD_TYPE_LABEL } from '../types'
import { TypeIcon, typeStyle } from './icons'

export function FindingTag({ finding }: { finding: Finding }) {
  return (
    <span className={`tag ${finding.sentiment}`} title={finding.sentiment === 'watch' ? 'Worth watching' : finding.sentiment}>
      {finding.text}
    </span>
  )
}

/** Up to `max` finding tags, then a "+n" tag. */
export function FindingTags({ findings, max = 2 }: { findings?: Finding[]; max?: number }) {
  if (!findings?.length) return null
  const shown = [...findings].sort((a, b) => rank(a) - rank(b)).slice(0, max)
  const rest = findings.length - shown.length
  return (
    <div className="tags">
      {shown.map((f, i) => (
        <FindingTag key={i} finding={f} />
      ))}
      {rest > 0 && <span className="tag more">+{rest} more</span>}
    </div>
  )
}
const rank = (f: Finding) => ({ negative: 0, watch: 1, positive: 2, neutral: 3 })[f.sentiment]

export function StatusPill({ status }: { status: EpisodeStatus }) {
  const label = { active: 'Active', monitoring: 'Monitoring', resolved: 'Resolved' }[status]
  return <span className={`status ${status}`}>{label}</span>
}

export function TypePill({ type }: { type: RecordType }) {
  return (
    <span className="type-pill" style={typeStyle(type)}>
      <TypeIcon type={type} /> {RECORD_TYPE_LABEL[type]}
    </span>
  )
}
