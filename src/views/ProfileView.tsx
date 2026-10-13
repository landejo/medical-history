import { useStore } from '../data/store'
import { daysBetween, formatDate, todayIso } from '../lib/format'
import { hrefFor } from '../lib/router'
import { isSurgery } from '../lib/timeline'

export function ProfileView() {
  const { index } = useStore()
  if (!index) return null
  const p = index.profile
  const surgeries = index.records.filter(isSurgery).sort((a, b) => (a.date < b.date ? -1 : 1))
  const today = todayIso()
  const dueClass = (due?: string) => {
    if (!due) return ''
    const d = daysBetween(today, due)
    return d < 0 ? 'overdue' : d < 60 ? 'due-soon' : 'ok'
  }
  const age = p.dob ? Math.floor(daysBetween(p.dob, today) / 365.25) : null
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{p.name || 'Profile'}</h1>
          <p className="lede">
            {[p.dob ? `Born ${formatDate(p.dob)}${age !== null ? ` (${age})` : ''}` : null, p.bloodType ? `Blood type ${p.bloodType}` : null].filter(Boolean).join(' · ') || 'The standing facts: conditions, medications, allergies, care team and screening schedule.'}
          </p>
        </div>
      </div>
      <div className="cards">
        <div className="card full">
          <div className="card-head">
            <h3>Surgical history</h3>
            <span className="stat"><b>{surgeries.length}</b> {surgeries.length === 1 ? 'surgery' : 'surgeries'} on record</span>
          </div>
          {surgeries.length ? (
            <ol className="list surgeries">
              {surgeries.map((r, i) => (
                <li key={r.id}>
                  <span className="n mono">{i + 1}</span>
                  <a href={hrefFor({ name: 'timeline', recordId: r.id })}>{r.title}</a>
                  <span className="r">{formatDate(r.date, r.datePrecision)}{r.provider?.name ? ` · ${r.provider.name}` : ''}</span>
                </li>
              ))}
            </ol>
          ) : <p className="muted small">No surgeries on record.</p>}
          {p.surgeryNote && <p className="muted small" style={{ marginTop: 10 }}>{p.surgeryNote}</p>}
        </div>
        <div className="card">
          <h3>Preventive screenings</h3>
          {p.screenings?.length ? (
            <ul className="list">
              {[...p.screenings].sort((a, b) => ((a.due ?? '9') < (b.due ?? '9') ? -1 : 1)).map((s) => (
                <li key={s.name}>
                  <span>{s.name}{s.note ? <span className="muted small"> — {s.note}</span> : null}</span>
                  <span className={`r ${dueClass(s.due)}`}>{s.due ? (daysBetween(today, s.due) < 0 ? 'Overdue · ' : 'Due ') + formatDate(s.due) : s.last ? `Last ${formatDate(s.last)}` : ''}</span>
                </li>
              ))}
            </ul>
          ) : <p className="muted small">No screenings tracked.</p>}
        </div>
        <div className="card">
          <h3>Conditions</h3>
          {p.conditions?.length ? (
            <ul className="list">
              {p.conditions.map((c) => (
                <li key={c.name}><span>{c.name}{c.status ? <span className="muted small"> — {c.status}</span> : null}</span><span className="r">{c.since ? `since ${formatDate(c.since)}` : ''}</span></li>
              ))}
            </ul>
          ) : <p className="muted small">None recorded.</p>}
        </div>
        <div className="card">
          <h3>Medications & supplements</h3>
          {p.medications?.length ? (
            <ul className="list">
              {p.medications.map((m) => (
                <li key={m.name}><span>{m.name} <span className="muted">{[m.dose, m.frequency].filter(Boolean).join(' ')}</span>{m.reason ? <span className="muted small"> — {m.reason}</span> : null}</span><span className="r">{m.since ? `since ${formatDate(m.since)}` : ''}</span></li>
              ))}
            </ul>
          ) : <p className="muted small">None recorded.</p>}
        </div>
        <div className="card">
          <h3>Allergies</h3>
          {p.allergies?.length ? (
            <ul className="list">
              {p.allergies.map((a) => (
                <li key={a.name}><span>{a.name}{a.reaction ? <span className="muted small"> — {a.reaction}</span> : null}</span><span className={`r ${a.severity === 'severe' ? 'overdue' : ''}`}>{a.severity ?? ''}</span></li>
              ))}
            </ul>
          ) : <p className="muted small">No known allergies.</p>}
        </div>
        <div className="card">
          <h3>Care team</h3>
          {p.careTeam?.length ? (
            <ul className="list">
              {p.careTeam.map((c) => (
                <li key={c.name}><span>{c.name}<span className="muted small"> — {c.role}{c.facility ? `, ${c.facility}` : ''}</span></span><span className="r">{c.phone ?? ''}</span></li>
              ))}
            </ul>
          ) : <p className="muted small">No care team listed.</p>}
        </div>
        <div className="card">
          <h3>In an emergency</h3>
          {p.emergency ? (
            <ul className="list">
              {p.emergency.contact && <li><span>Contact</span><span className="r">{p.emergency.contact}{p.emergency.phone ? ` · ${p.emergency.phone}` : ''}</span></li>}
              {p.emergency.notes && <li><span>{p.emergency.notes}</span></li>}
            </ul>
          ) : <p className="muted small">Nothing recorded.</p>}
        </div>
      </div>
      <p className="muted small" style={{ marginTop: 18 }}>Edit these in <span className="mono">profile.json</span> in your data repository.</p>
    </div>
  )
}
