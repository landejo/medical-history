import { describe, expect, it } from 'vitest'
import type { MedRecord } from '../types'
import { buildShareHtml } from './share'

const rec = (id: string, extra: Partial<MedRecord> = {}): MedRecord => ({ id, date: '2024-03-14', type: 'imaging', title: 'Title ' + id, synopsis: 'Synopsis ' + id, ...extra })

describe('buildShareHtml', () => {
  it('includes only the chosen records, with findings, values, report and images', () => {
    const html = buildShareHtml({
      ownerName: 'Demo',
      episodes: [{ id: 'acl', title: 'ACL tear', started: '2024-03-01', status: 'resolved', kind: 'injury', summary: '' }],
      records: [
        rec('mri', {
          episode: 'acl',
          findings: [{ text: 'Complete ACL tear', sentiment: 'negative' }],
          values: [{ name: 'LDL', value: 142, unit: 'mg/dL', range: '< 100', flag: 'high' }],
          report: '**IMPRESSION:** tear',
        }),
      ],
      attachments: { mri: [{ label: 'Sagittal T2', kind: 'image', dataUrl: 'data:image/svg+xml;base64,AAAA' }] },
    })
    expect(html).toContain('Title mri')
    expect(html).toContain('Part of: ACL tear')
    expect(html).toContain('class="f negative"')
    expect(html).toContain('<strong>IMPRESSION:</strong>')
    expect(html).toContain('data:image/svg+xml;base64,AAAA')
    expect(html).toContain('14 Mar 2024')
    expect(html).not.toContain('Title other')
  })
  it('escapes HTML in record text', () => {
    const html = buildShareHtml({ ownerName: 'D', episodes: [], records: [rec('x', { title: '<script>alert(1)</script>' })], attachments: {} })
    expect(html).not.toContain('<script>alert')
    expect(html).toContain('&lt;script&gt;')
  })
})
