import { Monitor, Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '../data/store'
import { MODEL_OPTIONS, type Settings } from '../lib/settings'
import { GitHubSource } from '../data/source'

export function SettingsView() {
  const { settings, updateSettings, status, error, reload } = useStore()
  const [gh, setGh] = useState(settings.github)
  const [key, setKey] = useState(settings.anthropic.apiKey)
  const [test, setTest] = useState<{ ok: boolean; msg: string } | null>(null)

  async function testConnection() {
    setTest(null)
    const src = new GitHubSource(gh)
    try {
      const res = await src.fetch('index.json')
      if (res.ok) {
        const idx = (await res.json()) as { records?: unknown[] }
        setTest({ ok: true, msg: `Connected. ${idx.records?.length ?? 0} records found.` })
      } else setTest({ ok: false, msg: res.status === 404 ? 'Repository or index.json not found. Check owner, repo and branch, and that index.json is committed.' : res.status === 401 ? 'Token rejected.' : `HTTP ${res.status}` })
    } catch (e) {
      setTest({ ok: false, msg: e instanceof Error ? e.message : String(e) })
    }
  }

  const saveGh = () => {
    updateSettings({ source: 'github', github: gh })
    setTest(null)
  }

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p className="lede">Everything here is stored only in this browser.</p>
        </div>
      </div>

      <section className="settings-section">
        <h2>Records</h2>
        <p className="desc">Where the app reads your records from. Current source: <b>{settings.source === 'github' ? `GitHub · ${settings.github.owner}/${settings.github.repo}` : import.meta.env.DEV ? 'local data server' : 'demo data'}</b> ({status}).{error ? ` ${error}` : ''}</p>
        {import.meta.env.DEV && (
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="seg">
              <button className={settings.source === 'local' ? 'on' : ''} onClick={() => updateSettings({ source: 'local' })}>Local folder</button>
              <button className={settings.source === 'github' ? 'on' : ''} onClick={() => updateSettings({ source: 'github' })}>GitHub</button>
            </div>
            <span className="muted small">Local reads ./private (or ./demo-data) through the dev server.</span>
          </div>
        )}
        <div className="grid-2">
          <div className="field"><label>Owner</label><input className="input" value={gh.owner} onChange={(e) => setGh({ ...gh, owner: e.target.value.trim() })} placeholder="landejo" /></div>
          <div className="field"><label>Repository</label><input className="input" value={gh.repo} onChange={(e) => setGh({ ...gh, repo: e.target.value.trim() })} placeholder="medical-records-data" /></div>
        </div>
        <div className="grid-2">
          <div className="field"><label>Branch</label><input className="input" value={gh.branch} onChange={(e) => setGh({ ...gh, branch: e.target.value.trim() })} /></div>
          <div className="field"><label>Fine-grained personal access token</label><input className="input" type="password" value={gh.token} onChange={(e) => setGh({ ...gh, token: e.target.value.trim() })} placeholder="github_pat_…" autoComplete="off" />
            <span className="hint">Needs Contents: read (and write, to add records from the app) on the data repository only.</span>
          </div>
        </div>
        {test && <div className={`notice ${test.ok ? 'ok' : 'error'}`}>{test.msg}</div>}
        <div className="row">
          <button className="btn" onClick={testConnection} disabled={!gh.owner || !gh.repo || !gh.token}>Test connection</button>
          <button className="btn primary" onClick={saveGh} disabled={!gh.owner || !gh.repo || !gh.token}>Use this repository</button>
          {settings.source === 'github' && <button className="btn ghost" onClick={reload}>Reload records</button>}
        </div>
      </section>

      <section className="settings-section">
        <h2>Ask Claude</h2>
        <p className="desc">Conversations go directly from this page to Anthropic's API using your own key, with your records as context. Usage is billed to your API account.</p>
        <div className="field"><label>Anthropic API key</label><input className="input" type="password" value={key} onChange={(e) => setKey(e.target.value.trim())} placeholder="sk-ant-…" autoComplete="off" /></div>
        <div className="field"><label>Model</label>
          <select className="select" value={settings.anthropic.model} onChange={(e) => updateSettings({ anthropic: { ...settings.anthropic, model: e.target.value as Settings['anthropic']['model'] } })}>
            {MODEL_OPTIONS.map((m) => <option key={m.id} value={m.id}>{m.label} — {m.note}</option>)}
          </select>
        </div>
        <div className="row">
          <button className="btn primary" onClick={() => updateSettings({ anthropic: { ...settings.anthropic, apiKey: key } })} disabled={key === settings.anthropic.apiKey}>Save key</button>
          {settings.anthropic.apiKey && <button className="btn ghost" onClick={() => { setKey(''); updateSettings({ anthropic: { ...settings.anthropic, apiKey: '' } }) }}>Remove key</button>}
        </div>
      </section>

      <section className="settings-section">
        <h2>Appearance</h2>
        <div className="seg">
          <button className={settings.theme === 'system' ? 'on' : ''} onClick={() => updateSettings({ theme: 'system' })}><Monitor /> System</button>
          <button className={settings.theme === 'light' ? 'on' : ''} onClick={() => updateSettings({ theme: 'light' })}><Sun /> Light</button>
          <button className={settings.theme === 'dark' ? 'on' : ''} onClick={() => updateSettings({ theme: 'dark' })}><Moon /> Dark</button>
        </div>
      </section>

      <section className="settings-section">
        <h2>Privacy</h2>
        <p className="desc">Tokens and keys live in this browser's local storage only. Records are fetched on demand and never stored on a server by this app. Clear everything below if you're on a shared device.</p>
        <button className="btn" onClick={() => { localStorage.clear(); sessionStorage.clear(); location.reload() }}>Forget tokens, keys and chat history on this device</button>
      </section>
    </div>
  )
}
