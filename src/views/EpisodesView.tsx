import { ArrowLeft, Plus } from 'lucide-react'
import { useMemo } from 'react'
import { Timeline } from '../components/Timeline'
import { FindingTag, StatusPill } from '../components/Tag'
import { useStore } from '../data/store'
import { formatDate, formatRange, plural } from '../lib/format'
import { hrefFor } from '../lib/router'
import { buildTimeline, recordsForEpisode } from '../lib/timeline'
import type { Episode, Sentiment } from '../types'

export function EpisodesView() {
  const { index } = useStore()
  if (!index) return null
  const order: Record<Episode['status'], number> = { active: 0, monitoring: 1, resolved: 2 }
  const episodes = [...index.episodes].sort((a, b) => order[a.status] - order[b.status] || (a.started < b.started ? 1 : -1))
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Episodes</h1>
          <p className="lede">A single health event and everything connected to it: the visits, scans, procedures and follow-ups.</p>
        </div>
      </div>
      {episodes.length === 0 && <p className="empty">No episodes yet. Create one when several records belong to the same story.</p>}
      {episodes.map((e) => {
        const recs = recordsForEpisode(index.records, e.id)
        return (
          <a className="ep-card" key={e.id} href={hrefFor({ name: 'episodes', episodeId: e.id })}>
            <div className="kicker">
              <StatusPill status={e.status} />
              <span>{formatRange(e.started, e.ended, e.startedPrecision)}</span>
              <span>· {plural(recs.length, 'record')}</span>
            </div>
            <h2>{e.title}</h2>
            <p>{e.summary}</p>
          </a>
        )
      })}
    </div>
  )
}

export function EpisodeView({ episodeId, activeId }: { episodeId: string; activeId?: string }) {
  const { index } = useStore()
  const episode = index?.episodes.find((e) => e.id === episodeId)
  const recs = useMemo(() => (index && episode ? recordsForEpisode(index.records, episode.id) : []), [index, episode])
  const items = useMemo(() => buildTimeline(recs, [], false), [recs])
  if (!index) return null
  if (!episode)
    return (
      <div className="page">
        <a className="back" href={hrefFor({ name: 'episodes' })}><ArrowLeft /> All episodes</a>
        <p className="empty">That episode doesn't exist.</p>
      </div>
    )
  const bySentiment: Record<Sentiment, { text: string; recordId: string }[]> = { negative: [], watch: [], positive: [], neutral: [] }
  for (const r of recs) for (const f of r.findings ?? []) bySentiment[f.sentiment].push({ text: f.text, recordId: r.id })
  const related = index.records
    .flatMap((r) => (r.related ?? []).filter((rel) => rel.episode === episode.id).map((rel) => ({ record: r, note: rel.note })))
    .sort((a, b) => (a.record.date < b.record.date ? -1 : 1))
  const imageCount = recs.reduce((n, r) => n + (r.attachments ?? []).filter((a) => a.kind === 'image').length, 0)
  const docCount = recs.reduce((n, r) => n + (r.attachments ?? []).filter((a) => a.kind !== 'image').length + (r.report ? 1 : 0), 0)
  return (
    <div className="page">
      <a className="back" href={hrefFor({ name: 'episodes' })}><ArrowLeft /> All episodes</a>
      <div className="ep-hero">
        <div className="kicker">
          <StatusPill status={episode.status} />
          <span>{formatRange(episode.started, episode.ended, episode.startedPrecision)}</span>
          <span>· {plural(recs.length, 'record')}</span>
        </div>
        <h1>{episode.title}</h1>
        <p className="summary">{episode.summary}</p>
      </div>
      <div className="ep-cols">
        <div>
          <h3 style={{ marginBottom: 12 }}>How it unfolded</h3>
          <Timeline items={items} activeId={activeId} hrefForRecord={(id) => hrefFor({ name: 'episodes', episodeId: episode.id, recordId: id })} />
          <a className="btn" href={hrefFor({ name: 'add', episodeId: episode.id })} style={{ marginTop: 8 }}><Plus /> Add a record to this episode</a>
        </div>
        <div>
          {related.length > 0 && (
            <div className="aside-card">
              <h3>Possible early signals</h3>
              <ul className="list related-list">
                {related.map(({ record, note }) => (
                  <li key={record.id}>
                    <a href={hrefFor({ name: 'timeline', recordId: record.id })}>
                      <span className="mono muted">{formatDate(record.date, record.datePrecision)}</span> {record.title}
                    </a>
                    <span className="muted small">{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(['negative', 'watch', 'positive'] as Sentiment[]).map((s) =>
            bySentiment[s].length ? (
              <div className="aside-card" key={s}>
                <h3>{{ negative: 'Concerns', watch: 'Worth watching', positive: 'Good news', neutral: '' }[s]}</h3>
                <ul className="findings">
                  {bySentiment[s].map((f, i) => (
                    <li key={i}>
                      <a href={hrefFor({ name: 'episodes', episodeId: episode.id, recordId: f.recordId })} style={{ display: 'block' }}>
                        <FindingTag finding={{ text: f.text, sentiment: s }} />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null,
          )}
          <div className="aside-card">
            <h3>Attached</h3>
            <ul className="list">
              <li><span>Images</span><span className="r">{imageCount}</span></li>
              <li><span>Reports & documents</span><span className="r">{docCount}</span></li>
              {episode.tags?.length ? <li><span>Tags</span><span className="r">{episode.tags.join(', ')}</span></li> : null}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
