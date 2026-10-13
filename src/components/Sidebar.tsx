import { Clock, Layers, MessageCircle, Plus, Settings, Share2, TrendingUp, User } from 'lucide-react'
import { useStore } from '../data/store'
import { hrefFor, type Route } from '../lib/router'
import { TEXT_SCALES, WIDTHS, stepTextScale } from '../lib/settings'
import { useUi } from '../ui'

const NAV: { route: Route; label: string; icon: typeof Clock }[] = [
  { route: { name: 'timeline' }, label: 'Timeline', icon: Clock },
  { route: { name: 'episodes' }, label: 'Episodes', icon: Layers },
  { route: { name: 'trends' }, label: 'Trends', icon: TrendingUp },
  { route: { name: 'profile' }, label: 'Profile', icon: User },
  { route: { name: 'share' }, label: 'Share', icon: Share2 },
]

export function Sidebar({ route }: { route: Route }) {
  const { index, source, status, settings, updateSettings } = useStore()
  const scaleLabel = TEXT_SCALES.find((s) => Math.abs(s.value - settings.textScale) < 1e-6)?.label ?? 'Custom'
  const { openChat } = useUi()
  const counts: Record<string, number | undefined> = {
    timeline: index?.records.length,
    episodes: index?.episodes.length,
  }
  return (
    <nav className="sidebar" aria-label="Main">
      <div className="brand">
        <div className="name">{index?.profile.name ? `${index.profile.name.split(' ')[0]}'s` : "Jason's"} Medical History</div>
        <div className="sub">{index ? `${index.records.length} records · ${index.episodes.length} episodes` : 'Personal health record'}</div>
      </div>
      <div className="nav">
        {NAV.map(({ route: r, label, icon: Icon }) => (
          <a key={r.name} href={hrefFor(r)} className={route.name === r.name ? 'active' : ''}>
            <Icon /> {label}
            {counts[r.name] !== undefined && <span className="count">{counts[r.name]}</span>}
          </a>
        ))}
        <a href={hrefFor({ name: 'add' })} className={route.name === 'add' ? 'active' : ''}><Plus /> Add record</a>
      </div>
      <button className="ask-btn" onClick={() => openChat()}><MessageCircle /> Ask Claude</button>
      <div className="spacer" />
      <div className="display-ctl" aria-label="Display">
        <div className="row-ctl">
          <span className="lbl">Text</span>
          <button className="mini" onClick={() => updateSettings({ textScale: stepTextScale(settings.textScale, -1) })} disabled={settings.textScale <= TEXT_SCALES[0].value} aria-label="Smaller text">A−</button>
          <span className="val">{scaleLabel}</span>
          <button className="mini" onClick={() => updateSettings({ textScale: stepTextScale(settings.textScale, 1) })} disabled={settings.textScale >= TEXT_SCALES[TEXT_SCALES.length - 1].value} aria-label="Larger text">A+</button>
        </div>
        <div className="row-ctl">
          <span className="lbl">Width</span>
          <div className="seg mini-seg" role="group" aria-label="Page width">
            {WIDTHS.map((w) => (
              <button key={w.value} className={settings.width === w.value ? 'on' : ''} onClick={() => updateSettings({ width: w.value })}>{w.label}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="nav">
        <a href={hrefFor({ name: 'settings' })} className={route.name === 'settings' ? 'active' : ''}><Settings /> Settings</a>
      </div>
      <div className="source-pill" title={status}>
        <span className={`dot ${status === 'ready' ? '' : 'off'}`} /> {source.kind === 'github' ? source.label : settings.source === 'local' && import.meta.env.DEV ? 'Local data' : 'Demo data'}
      </div>
    </nav>
  )
}

export function MobileBar({ route }: { route: Route }) {
  const { openChat } = useUi()
  return (
    <nav className="mobile-bar" aria-label="Main">
      {NAV.slice(0, 4).map(({ route: r, label, icon: Icon }) => (
        <a key={r.name} href={hrefFor(r)} className={route.name === r.name ? 'active' : ''}><Icon />{label}</a>
      ))}
      <button onClick={() => openChat()}><MessageCircle />Ask</button>
      <a href={hrefFor({ name: 'settings' })} className={route.name === 'settings' ? 'active' : ''}><Settings />More</a>
    </nav>
  )
}
