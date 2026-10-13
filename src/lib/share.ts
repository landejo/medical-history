import { marked } from 'marked'
import type { Episode, MedRecord } from '../types'
import { formatDate } from './format'
import { RECORD_TYPE_LABEL } from '../types'

export interface ShareAttachment {
  label: string
  kind: 'image' | 'pdf' | 'document'
  dataUrl: string
  /** Rendered text for markdown documents. */
  text?: string
}

export interface ShareInput {
  ownerName: string
  records: MedRecord[]
  episodes: Episode[]
  /** Keyed by record id. */
  attachments: Record<string, ShareAttachment[]>
  note?: string
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/**
 * Builds a single self-contained HTML file with the selected records (and their attachments inlined as
 * data URLs) so it can be sent to a doctor or family member without giving them access to the app.
 */
export function buildShareHtml(input: ShareInput): string {
  const records = [...input.records].sort((a, b) => (a.date < b.date ? 1 : -1))
  const epById = new Map(input.episodes.map((e) => [e.id, e]))
  const body = records
    .map((r) => {
      const ep = r.episode ? epById.get(r.episode) : undefined
      const findings = (r.findings ?? [])
        .map((f) => `<li class="f ${f.sentiment}">${esc(f.text)}</li>`)
        .join('')
      const values = (r.values ?? [])
        .map((v) => `<tr class="${v.flag ?? ''}"><td>${esc(v.name)}</td><td class="n">${esc(String(v.value))} ${esc(v.unit ?? '')}</td><td>${esc(v.range ?? '')}</td><td>${v.flag && v.flag !== 'normal' ? esc(v.flag) : ''}</td></tr>`)
        .join('')
      const report = r.report ? `<details><summary>Doctor's report</summary><div class="md">${marked.parse(r.report) as string}</div></details>` : ''
      const atts = (input.attachments[r.id] ?? [])
        .map((a) => {
          if (a.kind === 'image') return `<figure><img src="${a.dataUrl}" alt="${esc(a.label)}"><figcaption>${esc(a.label)}</figcaption></figure>`
          if (a.kind === 'document' && a.text) return `<details><summary>${esc(a.label)}</summary><div class="md">${marked.parse(a.text) as string}</div></details>`
          return `<p><a href="${a.dataUrl}" download="${esc(a.label)}">${esc(a.label)}</a> (${a.kind})</p>`
        })
        .join('')
      return `<article>
  <header><span class="type">${esc(RECORD_TYPE_LABEL[r.type])}</span> <time>${esc(formatDate(r.date))}</time>
  <h2>${esc(r.title)}</h2>
  <p class="meta">${esc([r.provider?.name, r.provider?.specialty, r.provider?.facility].filter(Boolean).join(' · '))}${ep ? ` · Part of: ${esc(ep.title)}` : ''}</p></header>
  <p class="syn">${esc(r.synopsis)}</p>
  ${findings ? `<ul class="findings">${findings}</ul>` : ''}
  ${values ? `<table><thead><tr><th>Test</th><th>Result</th><th>Reference</th><th></th></tr></thead><tbody>${values}</tbody></table>` : ''}
  ${report}${atts}
</article>`
    })
    .join('\n')

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(input.ownerName)} — shared medical records</title>
<style>
body{font:16px/1.55 -apple-system,"Segoe UI",Helvetica,Arial,sans-serif;color:#1f1e1c;background:#f8f4ec;margin:0;padding:32px 16px}
main{max-width:760px;margin:0 auto}h1{font-weight:500;font-size:28px;margin:0 0 4px}.sub{color:#6b6459;margin:0 0 28px}
article{background:#fffdf8;border:1px solid #ded6c8;border-radius:6px;padding:20px 22px;margin:0 0 18px}
.type{font:600 11px/1 sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#6b6459;border:1px solid #ded6c8;border-radius:4px;padding:3px 6px}
time{color:#6b6459;font-size:14px;margin-left:8px}h2{font-size:20px;font-weight:600;margin:10px 0 2px}.meta{color:#6b6459;font-size:14px;margin:0 0 12px}
.syn{margin:0 0 12px}ul.findings{list-style:none;padding:0;margin:0 0 12px}ul.findings li{padding:6px 10px;border-left:3px solid #c9c1b4;margin:0 0 6px;background:#f5efe4;border-radius:0 4px 4px 0}
li.negative{border-color:#9e2b25;background:#f7e4e1}li.positive{border-color:#2e6b3f;background:#e3efe4}li.watch{border-color:#8a5a12;background:#f6ebd2}
table{border-collapse:collapse;width:100%;font-size:14px;margin:0 0 12px}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #ede6da}th{color:#6b6459;font-weight:600}.n{font-variant-numeric:tabular-nums}tr.high td,tr.low td,tr.abnormal td{color:#9e2b25}
details{margin:8px 0}summary{cursor:pointer;color:#a6522f;font-weight:600}.md{padding:8px 0}figure{margin:12px 0}img{max-width:100%;border-radius:4px;background:#111}figcaption{font-size:13px;color:#6b6459}
footer{color:#6b6459;font-size:13px;margin-top:24px}
</style></head><body><main>
<h1>${esc(input.ownerName)} — shared medical records</h1>
<p class="sub">${records.length} record${records.length === 1 ? '' : 's'} · exported ${esc(formatDate(new Date().toISOString().slice(0, 10)))}${input.note ? ` · ${esc(input.note)}` : ''}</p>
${body}
<footer>Prepared with Jason's Medical History. Plain-English summaries were written to help understanding and are not a substitute for the original reports.</footer>
</main></body></html>`
}
