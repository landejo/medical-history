import { Paperclip, Trash } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '../data/store'
import { todayIso } from '../lib/format'
import { navigate } from '../lib/router'
import { RECORD_TYPES, RECORD_TYPE_LABEL, type Attachment, type Finding, type MedRecord, type RecordType, type Sentiment } from '../types'

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 48)
const kindOf = (name: string): Attachment['kind'] => (/\.(png|jpe?g|gif|webp|svg|bmp|tiff?)$/i.test(name) ? 'image' : /\.pdf$/i.test(name) ? 'pdf' : 'document')

export function AddRecordView({ episodeId }: { episodeId?: string }) {
  const { index, addRecord, source } = useStore()
  const [date, setDate] = useState(todayIso())
  const [type, setType] = useState<RecordType>('visit')
  const [title, setTitle] = useState('')
  const [provider, setProvider] = useState('')
  const [facility, setFacility] = useState('')
  const [episode, setEpisode] = useState(episodeId ?? '')
  const [synopsis, setSynopsis] = useState('')
  const [report, setReport] = useState('')
  const [findings, setFindings] = useState<Finding[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  if (!index) return null

  const canWrite = source.kind === 'github' || import.meta.env.DEV

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !synopsis.trim()) return
    setBusy(true)
    setErr(null)
    const id = `${date}-${slug(title)}`
    const record: MedRecord = {
      id,
      date,
      type,
      title: title.trim(),
      synopsis: synopsis.trim(),
      ...(provider || facility ? { provider: { ...(provider ? { name: provider.trim() } : {}), ...(facility ? { facility: facility.trim() } : {}) } } : {}),
      ...(episode ? { episode } : {}),
      ...(findings.filter((f) => f.text.trim()).length ? { findings: findings.filter((f) => f.text.trim()) } : {}),
      ...(report.trim() ? { report: report.trim() } : {}),
      ...(files.length ? { attachments: files.map((f) => ({ file: f.name, kind: kindOf(f.name), label: f.name.replace(/\.[^.]+$/, '') })) } : {}),
      source: { portal: 'Added in app', importedOn: todayIso() },
    }
    const problem = await addRecord(record, files)
    setBusy(false)
    if (problem) setErr(problem)
    else navigate(episode ? { name: 'episodes', episodeId: episode, recordId: id } : { name: 'timeline', recordId: id })
  }

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <div className="page-head">
        <div>
          <h1>Add a record</h1>
          <p className="lede">For a quick manual entry. For PDFs or portal downloads, drop them in the private inbox and let Claude Code write the synopsis, findings and file it under the right episode.</p>
        </div>
      </div>
      {!canWrite && <div className="notice error">The hosted demo can't save records. Connect your GitHub data repository in Settings first.</div>}
      <form onSubmit={submit}>
        <div className="grid-2">
          <div className="field"><label>Date</label><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
          <div className="field"><label>Type</label>
            <select className="select" value={type} onChange={(e) => setType(e.target.value as RecordType)}>
              {RECORD_TYPES.map((t) => <option key={t} value={t}>{RECORD_TYPE_LABEL[t]}</option>)}
            </select>
          </div>
        </div>
        <div className="field"><label>Title</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. MRI, right knee" required /></div>
        <div className="grid-2">
          <div className="field"><label>Doctor or clinician</label><input className="input" value={provider} onChange={(e) => setProvider(e.target.value)} /></div>
          <div className="field"><label>Facility</label><input className="input" value={facility} onChange={(e) => setFacility(e.target.value)} /></div>
        </div>
        <div className="field"><label>Episode</label>
          <select className="select" value={episode} onChange={(e) => setEpisode(e.target.value)}>
            <option value="">Not part of an episode</option>
            {index.episodes.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
        </div>
        <div className="field"><label>In plain English</label><textarea className="textarea" value={synopsis} onChange={(e) => setSynopsis(e.target.value)} placeholder="What happened and what it means, in a few sentences." required /></div>
        <div className="field">
          <label>What stood out</label>
          {findings.map((f, i) => (
            <div className="finding-row" key={i}>
              <input className="input" value={f.text} onChange={(e) => setFindings((fs) => fs.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} placeholder="e.g. LDL 142, above target" />
              <select className="select" value={f.sentiment} onChange={(e) => setFindings((fs) => fs.map((x, j) => (j === i ? { ...x, sentiment: e.target.value as Sentiment } : x)))}>
                <option value="negative">Concern</option><option value="watch">Watch</option><option value="positive">Good news</option><option value="neutral">Neutral</option>
              </select>
              <button type="button" className="icon-btn" onClick={() => setFindings((fs) => fs.filter((_, j) => j !== i))} aria-label="Remove"><Trash /></button>
            </div>
          ))}
          <div><button type="button" className="btn sm" onClick={() => setFindings((fs) => [...fs, { text: '', sentiment: 'neutral' }])}>Add a finding</button></div>
        </div>
        <div className="field"><label>Doctor's report (Markdown, optional)</label><textarea className="textarea" value={report} onChange={(e) => setReport(e.target.value)} placeholder="Paste the after-visit summary or report text." /></div>
        <div className="field">
          <label>Attachments</label>
          <label className="btn" style={{ alignSelf: 'flex-start' }}><Paperclip /> Choose files<input type="file" multiple hidden onChange={(e) => setFiles((f) => [...f, ...Array.from(e.target.files ?? [])])} /></label>
          {files.length > 0 && (
            <ul className="file-list">
              {files.map((f, i) => (
                <li key={i}>{f.name} <span className="faint">({kindOf(f.name)}, {(f.size / 1024).toFixed(0)} KB)</span> <button type="button" className="btn ghost sm" onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))}>remove</button></li>
              ))}
            </ul>
          )}
        </div>
        {err && <div className="notice error" style={{ whiteSpace: 'pre-wrap' }}>{err}</div>}
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn primary" type="submit" disabled={busy || !canWrite}>{busy ? 'Saving…' : 'Save record'}</button>
          <span className="muted small">Saves to {source.kind === 'github' ? source.label : 'the local data folder'}.</span>
        </div>
      </form>
    </div>
  )
}
