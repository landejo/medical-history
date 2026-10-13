import { useState } from 'react'
import { useStore } from '../data/store'
import { GitHubSource } from '../data/source'

export function ConnectView() {
  const { settings, updateSettings, status, error } = useStore()
  const [gh, setGh] = useState(settings.github)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function connect() {
    setBusy(true)
    setMsg(null)
    const res = await new GitHubSource(gh).fetch('index.json').catch(() => null)
    setBusy(false)
    if (res?.ok) updateSettings({ source: 'github', github: gh })
    else setMsg(!res ? 'Could not reach GitHub.' : res.status === 404 ? 'Not found. Check owner, repository, branch, and that index.json exists on that branch.' : res.status === 401 ? 'GitHub rejected that token.' : `GitHub returned HTTP ${res.status}.`)
  }

  return (
    <div className="connect">
      <h1>Jason's Medical History</h1>
      <p className="lede">Your records stay in a private GitHub repository. Enter a fine-grained token with read access to it and the app will load them here, on this device only.</p>
      {status === 'error' && error && <div className="notice error">{error}</div>}
      <div className="grid-2">
        <div className="field"><label>Owner</label><input className="input" value={gh.owner} onChange={(e) => setGh({ ...gh, owner: e.target.value.trim() })} placeholder="landejo" /></div>
        <div className="field"><label>Repository</label><input className="input" value={gh.repo} onChange={(e) => setGh({ ...gh, repo: e.target.value.trim() })} placeholder="medical-records-data" /></div>
      </div>
      <div className="grid-2">
        <div className="field"><label>Branch</label><input className="input" value={gh.branch} onChange={(e) => setGh({ ...gh, branch: e.target.value.trim() })} /></div>
        <div className="field"><label>Personal access token</label><input className="input" type="password" value={gh.token} onChange={(e) => setGh({ ...gh, token: e.target.value.trim() })} placeholder="github_pat_…" autoComplete="off" /></div>
      </div>
      {msg && <div className="notice error">{msg}</div>}
      <div className="row wrap">
        <button className="btn primary" onClick={connect} disabled={busy || !gh.owner || !gh.repo || !gh.token}>{busy ? 'Connecting…' : 'Connect'}</button>
        <button className="btn ghost" onClick={() => updateSettings({ source: 'local' })}>Browse the demo instead</button>
      </div>
      <p className="muted small" style={{ marginTop: 28 }}>Create the token at GitHub → Settings → Developer settings → Fine-grained tokens, limited to the data repository with Contents permission.</p>
    </div>
  )
}
