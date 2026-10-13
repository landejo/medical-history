import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import type { Episode, MedRecord } from '../types'
import { dayParts, formatMonthLong, formatRange, plural } from '../lib/format'
import { hrefFor } from '../lib/router'
import { groupByMonth, headlineSentiment, type TimelineItem } from '../lib/timeline'
import { TypeIcon, typeStyle } from './icons'
import { FindingTag, FindingTags, StatusPill } from './Tag'

interface Props {
  items: TimelineItem[]
  activeId?: string
  hrefForRecord: (id: string) => string
  compact?: boolean
}

export function RecordRow({ record, active, href, compact }: { record: MedRecord; active?: boolean; href: string; compact?: boolean }) {
  const { day, weekday } = dayParts(record.date)
  const sentiment = headlineSentiment(record)
  const who = [record.provider?.name, record.provider?.facility].filter(Boolean).join(' · ')
  return (
    <a className={`tl-row ${active ? 'active' : ''}`} href={href} style={typeStyle(record.type)}>
      <span className={`marker ${sentiment ?? ''}`} aria-hidden />
      <div className="when">
        <div className="d">{day}</div>
        <div className="w">{weekday}</div>
      </div>
      <div className="body">
        <div className="title">
          <TypeIcon type={record.type} />
          <span>{record.title}</span>
        </div>
        {who && <div className="sub">{who}</div>}
        {!compact && <FindingTags findings={record.findings} />}
        {compact && record.findings?.some((f) => f.sentiment !== 'neutral') && <FindingTags findings={record.findings} max={1} />}
      </div>
    </a>
  )
}

function EpisodeCluster({ episode, records, activeId, hrefForRecord }: { episode: Episode; records: MedRecord[]; activeId?: string; hrefForRecord: (id: string) => string }) {
  const [open, setOpen] = useState(records.some((r) => r.id === activeId))
  const notable = records.flatMap((r) => r.findings ?? []).filter((f) => f.sentiment !== 'neutral')
  const latest = records[0]
  return (
    <div className="tl-ep">
      <div className="tl-ep-head">
        <div>
          <div className="kicker">
            <span>Episode</span>
            <span className="range">{formatRange(episode.started, episode.ended ?? (episode.status === 'resolved' ? latest.date : undefined))}</span>
          </div>
          <div className="title">
            <a href={hrefFor({ name: 'episodes', episodeId: episode.id })}>{episode.title}</a>
          </div>
          <div className="summary">{episode.summary}</div>
          {notable.length > 0 && (
            <div className="tags">
              {notable.slice(0, 2).map((f, i) => (
                <FindingTag key={i} finding={f} />
              ))}
              {notable.length > 2 && <span className="tag more">+{notable.length - 2} more</span>}
            </div>
          )}
        </div>
        <StatusPill status={episode.status} />
      </div>
      <div className="tl-ep-foot">
        <button className={`toggle ${open ? 'open' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <ChevronRight /> {open ? 'Hide' : 'Show'} {plural(records.length, 'record')}
        </button>
        <span>· latest: {latest.title}</span>
      </div>
      {open && (
        <div className="sub-tl">
          <div className="tl-list">
            {records.map((r) => (
              <RecordRow key={r.id} record={r} active={r.id === activeId} href={hrefForRecord(r.id)} compact />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function Timeline({ items, activeId, hrefForRecord, compact }: Props) {
  const groups = groupByMonth(items)
  if (!groups.length) return <p className="empty">Nothing matches. Clear a filter or try a different search.</p>
  return (
    <div className="tl">
      {groups.map((g) => (
        <section className="tl-month" key={g.key} aria-label={formatMonthLong(g.key)}>
          <div className="tl-gutter">
            <div className="y" style={g.firstOfYear ? undefined : { visibility: 'hidden', height: compact ? 0 : undefined }}>{g.year}</div>
            <div className="m">{formatMonthLong(g.key).split(' ')[0]}</div>
          </div>
          <div className="tl-list">
            {g.items.map((it) =>
              it.kind === 'record' ? (
                <RecordRow key={it.record.id} record={it.record} active={it.record.id === activeId} href={hrefForRecord(it.record.id)} compact={compact} />
              ) : (
                <EpisodeCluster key={it.episode.id} episode={it.episode} records={it.records} activeId={activeId} hrefForRecord={hrefForRecord} />
              ),
            )}
          </div>
        </section>
      ))}
    </div>
  )
}
