import type { Settings } from '../lib/settings'

/** Reads (and optionally writes) files in a data root: profile.json, index.json, attachments/... */
export interface DataSource {
  kind: 'local' | 'github'
  label: string
  fetch(path: string): Promise<Response>
  /** Writes a file (creating or replacing). Returns an error message or null. */
  put(path: string, body: Blob | string, message: string): Promise<string | null>
  /** Link to the record file in GitHub, when applicable. */
  fileUrl?(path: string): string
}

export class LocalSource implements DataSource {
  kind = 'local' as const
  label = import.meta.env.DEV ? 'Local data server' : 'Demo data'
  private base = `${import.meta.env.BASE_URL}data/`
  async fetch(path: string) {
    return fetch(this.base + path.split('/').map(encodeURIComponent).join('/'), { cache: 'no-store' })
  }
  async put(path: string, body: Blob | string) {
    if (!import.meta.env.DEV) return 'Writes are not possible in the hosted demo. Connect a GitHub data repo in Settings.'
    const res = await fetch(this.base + path.split('/').map(encodeURIComponent).join('/'), { method: 'PUT', body })
    if (!res.ok) return `Local write failed (${res.status})`
    const json = (await res.json()) as { ok: boolean; errors: string[] }
    return json.ok ? null : json.errors.join('\n')
  }
}

export class GitHubSource implements DataSource {
  kind = 'github' as const
  label: string
  private cfg: Settings['github']
  constructor(cfg: Settings['github']) {
    this.cfg = cfg
    this.label = `${cfg.owner}/${cfg.repo}`
  }
  private url(path: string) {
    const p = path.split('/').map(encodeURIComponent).join('/')
    return `https://api.github.com/repos/${this.cfg.owner}/${this.cfg.repo}/contents/${p}?ref=${encodeURIComponent(this.cfg.branch)}`
  }
  private headers(accept: string) {
    return { Authorization: `Bearer ${this.cfg.token}`, Accept: accept, 'X-GitHub-Api-Version': '2022-11-28' }
  }
  async fetch(path: string) {
    return fetch(this.url(path), { headers: this.headers('application/vnd.github.raw+json') })
  }
  fileUrl(path: string) {
    return `https://github.com/${this.cfg.owner}/${this.cfg.repo}/blob/${this.cfg.branch}/${path}`
  }
  async put(path: string, body: Blob | string, message: string) {
    // Existing files need their sha to be replaced.
    let sha: string | undefined
    const head = await fetch(this.url(path), { headers: this.headers('application/vnd.github+json') })
    if (head.ok) sha = ((await head.json()) as { sha: string }).sha
    const bytes = new Uint8Array(await new Blob([body]).arrayBuffer())
    let bin = ''
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    const res = await fetch(this.url(path).split('?')[0], {
      method: 'PUT',
      headers: { ...this.headers('application/vnd.github+json'), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, content: btoa(bin), branch: this.cfg.branch, sha }),
    })
    if (res.ok) return null
    const err = (await res.json().catch(() => ({}))) as { message?: string }
    return `GitHub write failed (${res.status}): ${err.message ?? 'unknown error'}`
  }
}

export function makeSource(s: Settings): DataSource {
  return s.source === 'github' ? new GitHubSource(s.github) : new LocalSource()
}
