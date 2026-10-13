import { Check, ChevronRight, Clock, ExternalLink, FileText, Layers, MessageCircle, Share2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Attachment, MedRecord } from '../types'
import { useStore } from '../data/store'
import { formatDate } from '../lib/format'
import { hrefFor } from '../lib/router'
import { useUi } from '../ui'
import { Lightbox, type LightboxImage } from './Lightbox'
import { Markdown } from './Markdown'
import { FindingTag, TypePill } from './Tag'
import { ValuesTable } from './ValuesTable'

function useAttachmentUrl(recordId: string, file?: string) {
  const { attachmentUrl } = useStore()
  const [url, setUrl] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    if (!file) return
    let on = true
    attachmentUrl(recordId, file).then((u) => on && setUrl(u)).catch((e: Error) => on && setErr(e.message))
    return () => {
      on = false
    }
  }, [recordId, file, attachmentUrl])
  return { url, err }
}

function useAttachmentText(recordId: string, file?: string) {
  const { attachmentText } = useStore()
  const [text, setText] = useState<string | null>(null)
  useEffect(() => {
    if (!file) return
    let on = true
    attachmentText(recordId, file).then((t) => on && setText(t)).catch((e: Error) => on && setText(`_Could not load: ${e.message}_`))
    return () => {
      on = false
    }
  }, [recordId, file, attachmentText])
  return text
}

function PdfView({ recordId, file }: { recordId: string; file: string }) {
  const { url, err } = useAttachmentUrl(recordId, file)
  if (err) return <p className="muted small">{err}</p>
  if (!url) return <p className="muted small">Loading…</p>
  return (
    <>
      <iframe className="pdf-frame" src={url} title={file} />
      <p className="small" style={{ marginTop: 8 }}>
        <a href={url} target="_blank" rel="noreferrer">Open in a new tab <ExternalLink size={12} style={{ verticalAlign: -1 }} /></a>
      </p>
    </>
  )
}

function DocView({ recordId, file }: { recordId: string; file: string }) {
  const text = useAttachmentText(recordId, file)
  return text ? <Markdown text={text} /> : <p className="muted small">Loading…</p>
}

function Thumb({ recordId, att, onOpen }: { recordId: string; att: Attachment; onOpen: () => void }) {
  const { url } = useAttachmentUrl(recordId, att.file)
  return (
    <button className="thumb" onClick={onOpen} aria-label={`Open ${att.label ?? att.file}`}>
      {url && <img src={url} alt={att.label ?? att.file} />}
      <span className="cap">{att.label ?? att.file}</span>
    </button>
  )
}

function ImageGallery({ record }: { record: MedRecord }) {
  const { attachmentUrl } = useStore()
  const images = (record.attachments ?? []).filter((a) => a.kind === 'image')
  const [open, setOpen] = useState<number | null>(null)
  const [resolved, setResolved] = useState<LightboxImage[] | null>(null)
  useEffect(() => {
    if (open === null) return
    let on = true
    Promise.all(images.map(async (a) => ({ url: await attachmentUrl(record.id, a.file), label: a.label ?? a.file, caption: formatDate(record.date) }))).then((r) => on && setResolved(r))
    return () => {
      on = false
    }
  }, [open !== null, record.id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!images.length) return null
  return (
    <div className="section">
      <h3>Images</h3>
      <div className="thumbs">
        {images.map((a, i) => (
          <Thumb key={a.file} recordId={record.id} att={a} onOpen={() => setOpen(i)} />
        ))}
      </div>
      {open !== null && resolved && <Lightbox images={resolved} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </div>
  )
}

export function DetailPanel({ record, closeHref }: { record: MedRecord; closeHref: string }) {
  const { index, source } = useStore()
  const { openChat } = useUi()
  const episode = record.episode ? index?.episodes.find((e) => e.id === record.episode) : undefined
  const who = [record.provider?.name, record.provider?.specialty, record.provider?.facility].filter(Boolean).join(' · ')
  const docs = (record.attachments ?? []).filter((a) => a.kind !== 'image' && a.file !== record.reportFile)
  const reportIsPdf = record.reportFile?.toLowerCase().endsWith('.pdf')
  const fileLink = source.fileUrl?.(`records/${record.id}.json`)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('.lightbox')) window.location.hash = closeHref
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeHref])

  return (
    <aside className="detail" aria-label="Record details">
      <div className="detail-inner" key={record.id}>
        <div className="detail-top">
          <TypePill type={record.type} />
          <div className="actions">
            <button className="icon-btn" title="Ask Claude about this record" onClick={() => openChat(record)}><MessageCircle /></button>
            <a className="icon-btn" title="Share" href={hrefFor({ name: 'share' }) + `?r=${record.id}`}><Share2 /></a>
            <a className="icon-btn" title="Close" href={closeHref} aria-label="Close"><X /></a>
          </div>
        </div>
        <div className="when">{formatDate(record.date, record.datePrecision)}{record.datePrecision && record.datePrecision !== 'day' ? ' · exact date not on record' : ''}</div>
        <h1>{record.title}</h1>
        {who && <div className="meta">{who}</div>}
        {episode && (
          <a className="ep-link" href={hrefFor({ name: 'episodes', episodeId: episode.id })}>
            <Layers /> Part of: {episode.title} <ChevronRight />
          </a>
        )}
        {(record.related ?? []).map((rel) => {
          const ep = index?.episodes.find((e) => e.id === rel.episode)
          return ep ? (
            <a key={rel.episode} className="ep-link related" href={hrefFor({ name: 'episodes', episodeId: ep.id })} title={rel.note}>
              <Layers /> Related to: {ep.title} <ChevronRight />
            </a>
          ) : null
        })}
        {(record.related ?? []).map((rel) => (
          <p key={rel.episode + '-note'} className="related-note">{rel.note}</p>
        ))}

        <div className="section">
          <h3>In plain English</h3>
          <p className="synopsis">{record.synopsis}</p>
        </div>

        {record.findings && record.findings.length > 0 && (
          <div className="section">
            <h3>What stood out</h3>
            <ul className="findings">
              {record.findings.map((f, i) => (
                <li key={i}><FindingTag finding={f} /></li>
              ))}
            </ul>
          </div>
        )}

        {record.values && record.values.length > 0 && (
          <div className="section">
            <h3>Results</h3>
            <ValuesTable values={record.values} />
          </div>
        )}

        {record.followUp && record.followUp.length > 0 && (
          <div className="section">
            <h3>Follow-up</h3>
            <ul className="followups">
              {record.followUp.map((f, i) => (
                <li key={i}>
                  {f.done ? <Check /> : <Clock />}
                  <span>
                    <span className={f.done ? 'done' : ''}>{f.text}</span>
                    {f.due && <span className="due"> · due {formatDate(f.due)}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(record.report || record.reportFile) && (
          <div className="section">
            <h3>Doctor's report</h3>
            <details className="disclosure">
              <summary><ChevronRight className="chev" /> <FileText /> {reportIsPdf ? 'Original report (PDF)' : 'Full report'}</summary>
              <div className="inner">
                {record.report && <Markdown text={record.report} />}
                {record.reportFile && (reportIsPdf ? <PdfView recordId={record.id} file={record.reportFile} /> : <DocView recordId={record.id} file={record.reportFile} />)}
              </div>
            </details>
          </div>
        )}

        <ImageGallery record={record} />

        {docs.length > 0 && (
          <div className="section">
            <h3>Documents</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {docs.map((a) => (
                <details className="disclosure" key={a.file}>
                  <summary><ChevronRight className="chev" /> <FileText /> {a.label ?? a.file}</summary>
                  <div className="inner">{a.kind === 'pdf' ? <PdfView recordId={record.id} file={a.file} /> : <DocView recordId={record.id} file={a.file} />}</div>
                </details>
              ))}
            </div>
          </div>
        )}

        <div className="source-line">
          {record.source?.portal && <span>Source: {record.source.portal}</span>}
          {record.source?.importedOn && <span>Imported {formatDate(record.source.importedOn)}</span>}
          {record.tags?.length ? <span>Tags: {record.tags.join(', ')}</span> : null}
          {fileLink && <a href={fileLink} target="_blank" rel="noreferrer">View file on GitHub</a>}
        </div>
      </div>
    </aside>
  )
}
