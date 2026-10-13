import { Search, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Timeline } from '../components/Timeline'
import { useStore } from '../data/store'
import { daysBetween, formatDate, todayIso } from '../lib/format'
import { hrefFor } from '../lib/router'
import { buildTimeline, countByType, emptyFilters, filterRecords, isNotable, type Filters } from '../lib/timeline'
import { RECORD_TYPES, RECORD_TYPE_LABEL, type DataIndex, type RecordType } from '../types'

function Glance({ index }: { index: DataIndex }) {
  const today = todayIso()
  const active = index.episodes.filter((e) => e.status !== 'resolved')
  const yearAgo = `${Number(today.slice(0, 4)) - 1}${today.slice(4)}`
  const flagged = index.records.filter((r) => r.date >= yearAgo && (r.findings ?? []).some((f) => f.sentiment === 'negative' || f.sentiment === 'watch'))
  const due = (index.profile.screenings ?? [])
    .filter((s) => s.due)
    .sort((a, b) => (a.due! < b.due! ? -1 : 1))[0]
  const openFollowUps = index.records.flatMap((r) => (r.followUp ?? []).filter((f) => !f.done && f.due).map((f) => ({ ...f, record: r }))).sort((a, b) => (a.due! < b.due! ? -1 : 1))
  const nextFollow = openFollowUps[0]
  const dueDays = due?.due ? daysBetween(today, due.due) : null
  return (
    <div className="glance">
      <a href={hrefFor({ name: 'episodes' })}>
        <div className="k">Ongoing</div>
        <div className="v">{active.length}</div>
        <div className="d">{active[0]?.title ?? 'No active episodes'}</div>
      </a>
      <div>
        <div className="k">Flagged, past year</div>
        <div className="v">{flagged.length}</div>
        <div className="d">{flagged[0] ? `Latest: ${flagged[0].title}` : 'Nothing flagged'}</div>
      </div>
      <a href={hrefFor({ name: 'profile' })}>
        <div className="k">Next screening</div>
        <div className="v text">{due?.name ?? '—'}</div>
        <div className="d">{due?.due ? (dueDays! < 0 ? `Overdue since ${formatDate(due.due)}` : `Due ${formatDate(due.due)}`) : 'Nothing scheduled'}</div>
      </a>
      <a href={nextFollow ? hrefFor({ name: 'timeline', recordId: nextFollow.record.id }) : hrefFor({ name: 'timeline' })}>
        <div className="k">Open follow-up</div>
        <div className="v text">{nextFollow ? nextFollow.text : 'None'}</div>
        <div className="d">{nextFollow?.due ? `Due ${formatDate(nextFollow.due)}` : 'All follow-ups done'}</div>
      </a>
    </div>
  )
}

export function TimelineView({ activeId }: { activeId?: string }) {
  const { index } = useStore()
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [grouped, setGrouped] = useState(true)
  const records = useMemo(() => index?.records ?? [], [index])
  const counts = useMemo(() => countByType(records), [records])
  const filtered = useMemo(() => filterRecords(records, filters), [records, filters])
  const items = useMemo(() => buildTimeline(filtered, index?.episodes ?? [], grouped), [filtered, index, grouped])
  const notableCount = useMemo(() => records.filter(isNotable).length, [records])
  if (!index) return null

  const toggleType = (t: RecordType) =>
    setFilters((f) => {
      const types = new Set(f.types)
      if (types.has(t)) types.delete(t)
      else types.add(t)
      return { ...f, types }
    })

  return (
    <div className="page">
      {index.demo && (
        <div className="demo-banner"><TriangleAlert /> You're looking at fictional demo data. Connect your own records in Settings, or drop files into the private inbox for Claude Code to process.</div>
      )}
      <div className="page-head">
        <div>
          <h1>Timeline</h1>
          <p className="lede">Every visit, test and result, newest first. Related records are grouped into episodes.</p>
        </div>
      </div>
      <Glance index={index} />
      <div className="toolbar">
        <div className="search">
          <Search />
          <input className="input" type="search" placeholder="Search records, findings, doctors…" value={filters.query} onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))} />
        </div>
        <div className="chips">
          <button className={`chip ${filters.types.size === 0 ? 'on' : ''}`} onClick={() => setFilters((f) => ({ ...f, types: new Set() }))}>All <span className="n">{records.length}</span></button>
          {RECORD_TYPES.filter((t) => counts.get(t)).map((t) => (
            <button key={t} className={`chip ${filters.types.has(t) ? 'on' : ''}`} onClick={() => toggleType(t)}>
              {RECORD_TYPE_LABEL[t]} <span className="n">{counts.get(t)}</span>
            </button>
          ))}
          <span style={{ width: 8 }} />
          <button className={`chip ${filters.notableOnly ? 'on' : ''}`} onClick={() => setFilters((f) => ({ ...f, notableOnly: !f.notableOnly }))}>Notable only <span className="n">{notableCount}</span></button>
          <button className={`chip ${grouped ? 'on' : ''}`} onClick={() => setGrouped((g) => !g)} title="Group related records under their episode">Group episodes</button>
        </div>
      </div>
      <Timeline items={items} activeId={activeId} hrefForRecord={(id) => hrefFor({ name: 'timeline', recordId: id })} />
    </div>
  )
}
