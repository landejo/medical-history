import type Anthropic from '@anthropic-ai/sdk'
import { Send, Square, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { DataIndex, MedRecord } from '../types'
import { buildSystemPrompt, describeError, makeClient, streamReply } from '../lib/claude'
import type { Settings } from '../lib/settings'
import { hrefFor } from '../lib/router'
import { Markdown } from './Markdown'

interface Msg {
  role: 'user' | 'assistant'
  text: string
  error?: boolean
}

const SUGGESTIONS = [
  'What patterns do you see across my records over the last few years?',
  'Which findings should I keep an eye on, and why?',
  'What lifestyle changes would make the biggest difference based on my history?',
  'What should I ask about at my next physical?',
]

const STORAGE = 'mh.chat.v1'

export function ChatDrawer({ index, settings, focus, onClose }: { index: DataIndex; settings: Settings; focus?: MedRecord; onClose: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE) ?? '[]') as Msg[]
    } catch {
      return []
    }
  })
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const abort = useRef<AbortController | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const client = useMemo(() => (settings.anthropic.apiKey ? makeClient(settings.anthropic.apiKey) : null), [settings.anthropic.apiKey])

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE, JSON.stringify(msgs.slice(-40)))
    } catch {
      /* ignore */
    }
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight })
  }, [msgs])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function send(text: string) {
    const q = text.trim()
    if (!q || busy || !client) return
    setInput('')
    const history: Anthropic.MessageParam[] = [...msgs.filter((m) => !m.error), { role: 'user' as const, text: q }].map((m) => ({ role: m.role as 'user' | 'assistant', content: m.text }))
    setMsgs((m) => [...m, { role: 'user', text: q }, { role: 'assistant', text: '' }])
    setBusy(true)
    abort.current = new AbortController()
    try {
      const system = buildSystemPrompt(index, focus)
      for await (const delta of streamReply(client, settings.anthropic.model, system, history, abort.current.signal)) {
        setMsgs((m) => {
          const copy = m.slice()
          const last = copy[copy.length - 1]
          copy[copy.length - 1] = { ...last, text: last.text + delta }
          return copy
        })
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        setMsgs((m) => [...m.slice(0, -1), { role: 'assistant', text: describeError(e), error: true }])
      }
    } finally {
      setBusy(false)
      abort.current = null
    }
  }

  return (
    <>
      <div className="chat-backdrop" onClick={onClose} />
      <section className="chat" aria-label="Ask Claude">
        <div className="head">
          <div>
            <div className="t">Ask Claude</div>
            <div className="s">Answers are drawn from your records. Not medical advice.</div>
          </div>
          <div className="row" style={{ gap: 4 }}>
            {msgs.length > 0 && (
              <button className="btn ghost sm" onClick={() => setMsgs([])} disabled={busy}>Clear</button>
            )}
            <button className="icon-btn" onClick={onClose} aria-label="Close"><X /></button>
          </div>
        </div>
        <div className="msgs" ref={scroller}>
          {!client && (
            <div className="msg error">
              Add your Anthropic API key in <a href={hrefFor({ name: 'settings' })} onClick={onClose}>Settings</a> to start a conversation. The key stays in this browser.
            </div>
          )}
          {focus && (
            <span className="context-pill">Talking about: {focus.title}</span>
          )}
          {msgs.length === 0 && client && (
            <div>
              <p className="muted small">Try one of these, or ask anything about your history.</p>
              <div className="suggest">
                {(focus ? [`What does this ${focus.type === 'lab' ? 'lab result' : focus.type} mean in plain terms?`, 'Is anything here worth following up on?', ...SUGGESTIONS.slice(0, 2)] : SUGGESTIONS).map((s) => (
                  <button key={s} onClick={() => send(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={`msg ${m.role} ${m.error ? 'error' : ''}`}>
              {m.role === 'user' ? m.text : m.text ? <Markdown text={m.text} /> : <span className="muted">Thinking…</span>}
            </div>
          ))}
        </div>
        <form
          className="compose"
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
        >
          <textarea
            className="textarea"
            value={input}
            placeholder={client ? 'Ask about a result, a pattern, or what to do next…' : 'Add an API key in Settings first'}
            disabled={!client || busy}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send(input)
              }
            }}
          />
          {busy ? (
            <button type="button" className="btn" onClick={() => abort.current?.abort()} aria-label="Stop"><Square /></button>
          ) : (
            <button type="submit" className="btn primary" disabled={!client || !input.trim()} aria-label="Send"><Send /></button>
          )}
          <div className="foot">
            <span>{settings.anthropic.model}</span>
            <span>Enter to send · Shift+Enter for a new line</span>
          </div>
        </form>
      </section>
    </>
  )
}
