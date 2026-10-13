import { Share2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useStore } from '../data/store'
import { formatDate, plural } from '../lib/format'
import { buildShareHtml, type ShareAttachment } from '../lib/share'
import type { MedRecord } from '../types'
import { RECORD_TYPE_LABEL } from '../types'

function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result as string)
    r.onerror = rej
    r.readAsDataURL(b)
  })
}

export function ShareView() {
  const { index, source } = useStore()
  const preselect = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('r')
  const [sel, setSel] = useState<Set<string>>(() => new Set(preselect ? [preselect] : []))
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const groups = useMemo(() => {
    if (!index) return []
    const out: { title: string; records: MedRecord[] }[] = []
    for (const e of index.episodes) {
      const recs = index.records.filter((r) => r.episode === e.id)
      if (recs.length) out.push({ title: e.title, records: recs })
    }
    const loose = index.records.filter((r) => !r.episode || !index.episodes.some((e) => e.id === r.episode))
    if (loose.length) out.push({ title: 'Other records', records: loose })
    return out
  }, [index])
  if (!index) return null

  const toggle = (id: string) =>
    setSel((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const toggleGroup = (recs: MedRecord[]) =>
    setSel((s) => {
      const n = new Set(s)
      const all = recs.every((r) => n.has(r.id))
      for (const r of recs) {
        if (all) n.delete(r.id)
        else n.add(r.id)
      }
      return n
    })

  async function exportHtml() {
    setBusy(true)
    setErr(null)
    try {
      const records = index!.records.filter((r) => sel.has(r.id))
      const attachments: Record<string, ShareAttachment[]> = {}
      for (const r of records) {
        const list: ShareAttachment[] = []
        for (const a of r.attachments ?? []) {
          const res = await source.fetch(`attachments/${r.id}/${a.file}`)
          if (!res.ok) continue
          const blob = await res.blob()
          const item: ShareAttachment = { label: a.label ?? a.file, kind: a.kind, dataUrl: await blobToDataUrl(blob) }
          if (a.kind === 'document' && a.file.endsWith('.md')) item.text = await blob.text()
          list.push(item)
        }
        if (r.reportFile && !(r.attachments ?? []).some((a) => a.file === r.reportFile)) {
          const res = await source.fetch(`attachments/${r.id}/${r.reportFile}`)
          if (res.ok) {
            const blob = await res.blob()
            const isMd = r.reportFile.endsWith('.md')
            list.unshift({ label: "Doctor's report", kind: isMd ? 'document' : 'pdf', dataUrl: await blobToDataUrl(blob), text: isMd ? await blob.text() : undefined })
          }
        }
        attachments[r.id] = list
      }
      const html = buildShareHtml({ ownerName: index!.profile.name || 'Medical records', records, episodes: index!.episodes, attachments, note: note.trim() || undefined })
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `medical-records-${new Date().toISOString().slice(0, 10)}.html`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Share</h1>
          <p className="lede">Pick the records to share and export them as a single file you can email or print. Images and reports are embedded, so nothing links back to this app.</p>
        </div>
      </div>
      <div className="share-list">
        {groups.map((g) => (
          <div key={g.title}>
            <div className="share-group">
              <label style={{ display: 'flex', gap: 8, padding: 0, border: 0, alignItems: 'center', textTransform: 'none', letterSpacing: 0, fontSize: 13 }}>
                <input type="checkbox" checked={g.records.every((r) => sel.has(r.id))} onChange={() => toggleGroup(g.records)} /> {g.title}
              </label>
            </div>
            {g.records.map((r) => (
              <label key={r.id}>
                <input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} />
                <span className="mono muted d">{formatDate(r.date)}</span>
                <span>{r.title}<span className="muted small"> · {RECORD_TYPE_LABEL[r.type]}</span></span>
                <span className="muted small">{(r.attachments ?? []).length ? `${(r.attachments ?? []).length} files` : ''}</span>
              </label>
            ))}
          </div>
        ))}
      </div>
      <div className="field" style={{ marginTop: 16 }}>
        <label>Note for the recipient (optional)</label>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Records for Dr. Castillo ahead of the March visit" />
      </div>
      {err && <div className="notice error">{err}</div>}
      <div className="share-bar">
        <span className="muted">{plural(sel.size, 'record')} selected</span>
        <div className="row">
          <button className="btn ghost sm" onClick={() => setSel(new Set())} disabled={!sel.size}>Clear</button>
          <button className="btn primary" onClick={exportHtml} disabled={!sel.size || busy}><Share2 /> {busy ? 'Preparing…' : 'Export HTML'}</button>
        </div>
      </div>
    </div>
  )
}
