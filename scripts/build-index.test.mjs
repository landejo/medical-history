import { describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildIndex } from './build-index.mjs'

function fixture(records) {
  const root = mkdtempSync(join(tmpdir(), 'mh-'))
  mkdirSync(join(root, 'episodes'))
  mkdirSync(join(root, 'records'))
  writeFileSync(join(root, 'episodes', 'liver.json'), JSON.stringify({ id: 'liver', title: 'Liver', started: '2025-01-01', status: 'active', kind: 'condition', summary: '' }))
  for (const r of records) writeFileSync(join(root, 'records', `${r.id}.json`), JSON.stringify(r))
  return root
}
const base = { date: '2019-02-13', type: 'hospital', title: 'ER', synopsis: 's' }

describe('buildIndex related links', () => {
  it('accepts a record related to an existing episode', () => {
    const { errors } = buildIndex(fixture([{ ...base, id: 'er', related: [{ episode: 'liver', note: 'early signal' }] }]))
    expect(errors).toEqual([])
  })
  it('rejects unknown related episodes and self-references', () => {
    const { errors } = buildIndex(
      fixture([
        { ...base, id: 'a', related: [{ episode: 'nope', note: '' }] },
        { ...base, id: 'b', episode: 'liver', related: [{ episode: 'liver', note: '' }] },
      ]),
    )
    expect(errors.some((e) => e.includes('a: related to unknown episode "nope"'))).toBe(true)
    expect(errors.some((e) => e.includes('b: related episode "liver" is already its own episode'))).toBe(true)
  })
})
