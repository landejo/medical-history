#!/usr/bin/env node
// Builds <root>/index.json from profile.json, episodes/*.json and records/*.json.
// Usage: node scripts/build-index.mjs [data-root]   (default: ./private if it exists, else ./demo-data)
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

export function buildIndex(root) {
  const errors = []
  const readJson = (p) => {
    try {
      return JSON.parse(readFileSync(p, 'utf8'))
    } catch (e) {
      errors.push(`${p}: ${e.message}`)
      return null
    }
  }
  const listJson = (dir) =>
    existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).sort() : []

  const profile = existsSync(join(root, 'profile.json')) ? readJson(join(root, 'profile.json')) : { name: '' }
  const episodes = listJson(join(root, 'episodes')).map((f) => readJson(join(root, 'episodes', f))).filter(Boolean)
  const records = listJson(join(root, 'records')).map((f) => readJson(join(root, 'records', f))).filter(Boolean)

  const episodeIds = new Set(episodes.map((e) => e.id))
  const seen = new Set()
  const isoDate = /^\d{4}-\d{2}-\d{2}$/
  for (const r of records) {
    if (!r.id) errors.push(`record missing id: ${JSON.stringify(r).slice(0, 60)}`)
    if (seen.has(r.id)) errors.push(`duplicate record id: ${r.id}`)
    seen.add(r.id)
    if (!isoDate.test(r.date ?? '')) errors.push(`${r.id}: date must be YYYY-MM-DD`)
    if (!r.type) errors.push(`${r.id}: missing type`)
    if (!r.title) errors.push(`${r.id}: missing title`)
    if (!r.synopsis) errors.push(`${r.id}: missing synopsis`)
    if (r.episode && !episodeIds.has(r.episode)) errors.push(`${r.id}: unknown episode "${r.episode}"`)
    for (const rel of r.related ?? []) {
      if (!episodeIds.has(rel.episode)) errors.push(`${r.id}: related to unknown episode "${rel.episode}"`)
      if (rel.episode === r.episode) errors.push(`${r.id}: related episode "${rel.episode}" is already its own episode`)
    }
    for (const a of r.attachments ?? []) {
      const p = join(root, 'attachments', r.id, a.file)
      if (!existsSync(p)) errors.push(`${r.id}: missing attachment ${a.file}`)
    }
    if (r.reportFile && !existsSync(join(root, 'attachments', r.id, r.reportFile)))
      errors.push(`${r.id}: missing reportFile ${r.reportFile}`)
  }
  for (const e of episodes) {
    if (!isoDate.test(e.started ?? '')) errors.push(`episode ${e.id}: started must be YYYY-MM-DD`)
    for (const rel of e.related ?? []) {
      if (!episodeIds.has(rel.episode)) errors.push(`episode ${e.id}: related to unknown episode "${rel.episode}"`)
      if (rel.episode === e.id) errors.push(`episode ${e.id}: related to itself`)
    }
  }
  records.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id.localeCompare(b.id)))
  episodes.sort((a, b) => (a.started < b.started ? 1 : -1))

  const index = {
    generatedAt: new Date().toISOString(),
    demo: existsSync(join(root, 'DEMO')) || undefined,
    profile,
    episodes,
    records,
  }
  return { index, errors }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname
if (isMain) {
  const arg = process.argv[2]
  const root = resolve(arg ?? (existsSync('private') && statSync('private').isDirectory() && existsSync('private/records') ? 'private' : 'demo-data'))
  const { index, errors } = buildIndex(root)
  if (errors.length) {
    console.error(`✗ ${errors.length} problem(s) in ${root}:`)
    for (const e of errors) console.error('  - ' + e)
    process.exit(1)
  }
  writeFileSync(join(root, 'index.json'), JSON.stringify(index, null, 2) + '\n')
  console.log(`✓ ${root}/index.json — ${index.records.length} records, ${index.episodes.length} episodes`)
}
