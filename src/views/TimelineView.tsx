import { Search, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Overview } from '../components/Overview'
import { Timeline } from '../components/Timeline'
import { useStore } from '../data/store'
import { daysBetween, formatDate, todayIso } from '../lib/format'
import { hrefFor } from '../lib/router'
import { buildTimeline, countByType, emptyFilters, filterRecords, isNotable, isSurgery, siteCounts, type Filters } from '../lib/timeline'
import { RECORD_TYPES, RECORD_TYPE_LABEL, type DataIndex, type RecordType } from '../types'

const MAX_ITEMS = 3

function GlanceCard({ label, count, more, children }: { label: string; count: number; more?: { n: number; href: string }; children: React.ReactNode }) {
  return (
    <div className="glance-card">
      <div className="k">{label}</div>
      <div className="v">{count}</div>
      <ul className="glance-list">{children}</ul>
      {more && more.n > 0 && <a className="glance-more" href={more.href}>+{more.n} more</a>}
    </div>
  )
}

function Glance({ index }: { index: DataIndex }) {
  const today = todayIso()
  const yearAgo = `${Number(today.slice(0, 4)) - 1}${today.slice(4)}`
  const ongoing = index.episodes.filter((e) => e.status !== 'resolved')
  const flagged = index.records.filter((r) => r.date >= yearAgo && (r.findings ?? []).some((f) => f.sentiment === 'negative' || f.sentiment === 'watch'))
  const screenings = (index.profile.screenings ?? [])
    .filter((s) => s.due && daysBetween(today, s.due) <= 90)
    .sort((a, b) => (a.due! < b.due! ? -1 : 1))
  // Undated follow-ups count too; dated ones come first, soonest first.
  const followUps = index.records
    .flatMap((r) => (r.followUp ?? []).filter((f) => !f.done).map((f) => ({ ...f, record: r })))
    .sort((a, b) => (a.due ?? '9999') < (b.due ?? '9999') ? -1 : (a.due ?? '9999') > (b.due ?? '9999') ? 1 : a.record.date < b.record.date ? 1 : -1)
  return (
    <div className="glance">
      <GlanceCard label="Ongoing" count={ongoing.length} more={{ n: ongoing.length - MAX_ITEMS, href: hrefFor({ name: 'episodes' }) }}>
        {ongoing.length === 0 && <li className="muted">Nothing ongoing</li>}
        {ongoing.slice(0, MAX_ITEMS).map((e) => (
          <li key={e.id}><a href={hrefFor({ name: 'episodes', episodeId: e.id })}>{e.title}</a></li>
        ))}
      </GlanceCard>
      <GlanceCard label="Flagged, past year" count={flagged.length}>
        {flagged.length === 0 && <li className="muted">Nothing flagged</li>}
        {flagged.slice(0, MAX_ITEMS).map((r) => (
          <li key={r.id}>
            <a href={hrefFor({ name: 'timeline', recordId: r.id })}>{r.title}</a>
            <span className="when">{formatDate(r.date, r.datePrecision)}</span>
          </li>
        ))}
      </GlanceCard>
      <GlanceCard label="Screenings due" count={screenings.length} more={{ n: screenings.length - MAX_ITEMS, href: hrefFor({ name: 'profile' }) }}>
        {screenings.length === 0 && <li className="muted">Nothing due in the next 90 days</li>}
        {screenings.slice(0, MAX_ITEMS).map((s) => (
          <li key={s.name}>
            <a href={hrefFor({ name: 'profile' })}>{s.name}</a>
            <span className={`when ${daysBetween(today, s.due!) < 0 ? 'overdue' : ''}`}>{daysBetween(today, s.due!) < 0 ? `Overdue since ${formatDate(s.due)}` : `Due ${formatDate(s.due)}`}</span>
          </li>
        ))}
      </GlanceCard>
      <GlanceCard label="Open follow-ups" count={followUps.length}>
        {followUps.length === 0 && <li className="muted">All follow-ups done</li>}
        {followUps.slice(0, MAX_ITEMS).map((f, i) => (
          <li key={i}>
            <a href={hrefFor({ name: 'timeline', recordId: f.record.id })}>{f.text}</a>
            <span className="when">{f.due ? `Due ${formatDate(f.due)}` : `From ${formatDate(f.record.date, f.record.datePrecision)}`}</span>
          </li>
        ))}
      </GlanceCard>
    </div>
  )
}

export function TimelineView({ activeId }: { activeId?: string }) {
  const { index, settings, updateSettings } = useStore()
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [grouped, setGrouped] = useState(true)
  const records = useMemo(() => index?.records ?? [], [index])
  const counts = useMemo(() => countByType(records), [records])
  const filtered = useMemo(() => filterRecords(records, filters, index?.episodes), [records, filters, index])
  const sites = useMemo(() => siteCounts(records, index?.episodes ?? []), [records, index])
  const items = useMemo(() => buildTimeline(filtered, index?.episodes ?? [], grouped), [filtered, index, grouped])
  const notableCount = useMemo(() => records.filter(isNotable).length, [records])
  const surgeryCount = useMemo(() => records.filter(isSurgery).length, [records])
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
        <div className="toolbar-row">
          <div className="search">
            <Search />
            <input className="input" type="search" placeholder="Search records, findings, doctors…" value={filters.query} onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))} />
          </div>
          {sites.length > 0 && (
            <div className="site-filter">
              <label htmlFor="site">Body area</label>
              <select id="site" className="select" value={filters.site} onChange={(e) => setFilters((f) => ({ ...f, site: e.target.value }))}>
                <option value="">All body areas</option>
                {sites.map((s) => (
                  <option key={s.site} value={s.site}>{s.site} ({s.count})</option>
                ))}
              </select>
              {filters.site && <button className="btn ghost sm" onClick={() => setFilters((f) => ({ ...f, site: '' }))}>Clear</button>}
            </div>
          )}
        </div>
        <div className="chips">
          <button className={`chip ${filters.types.size === 0 ? 'on' : ''}`} onClick={() => setFilters((f) => ({ ...f, types: new Set() }))}>All <span className="n">{records.length}</span></button>
          {RECORD_TYPES.filter((t) => counts.get(t)).map((t) => (
            <button key={t} className={`chip ${filters.types.has(t) ? 'on' : ''}`} onClick={() => toggleType(t)}>
              {RECORD_TYPE_LABEL[t]} <span className="n">{counts.get(t)}</span>
            </button>
          ))}
          <span className="chip-gap" />
          {surgeryCount > 0 && (
            <button className={`chip ${filters.surgeryOnly ? 'on' : ''}`} onClick={() => setFilters((f) => ({ ...f, surgeryOnly: !f.surgeryOnly }))} title="Operations only (excludes injections)">Surgeries <span className="n">{surgeryCount}</span></button>
          )}
          <button className={`chip ${filters.notableOnly ? 'on' : ''}`} onClick={() => setFilters((f) => ({ ...f, notableOnly: !f.notableOnly }))}>Notable only <span className="n">{notableCount}</span></button>
          <button className={`chip ${grouped ? 'on' : ''}`} onClick={() => setGrouped((g) => !g)} title="Group related records under their episode">Group episodes</button>
          <button className={`chip ov-toggle ${settings.showOverview ? 'on' : ''}`} onClick={() => updateSettings({ showOverview: !settings.showOverview })} title="Horizontal overview of episodes across the years">Overview</button>
        </div>
      </div>
      {settings.showOverview && <Overview records={filtered} episodes={index.episodes} today={todayIso()} activeId={activeId} layoutKey={`${settings.width}:${settings.textScale}`} />}
      {filters.surgeryOnly && (
        <p className="filter-note">
          {filtered.length} {filtered.length === 1 ? 'surgery' : 'surgeries'} on record{filters.site ? ` for the ${filters.site.toLowerCase()}` : ''}.{' '}
          {index.profile.surgeryNote && <span className="muted">{index.profile.surgeryNote}</span>}
        </p>
      )}
      <Timeline items={items} activeId={activeId} hrefForRecord={(id) => hrefFor({ name: 'timeline', recordId: id })} />
    </div>
  )
}
