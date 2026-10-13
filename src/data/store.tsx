import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { DataIndex, MedRecord } from '../types'
import { applyDisplay, applyTheme, loadSettings, saveSettings, type Settings } from '../lib/settings'
import { makeSource, type DataSource } from './source'

type Status = 'idle' | 'loading' | 'ready' | 'error' | 'unconfigured'

interface Store {
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void
  source: DataSource
  status: Status
  error: string | null
  index: DataIndex | null
  reload: () => void
  /** Object URL for an attachment (cached for the session). */
  attachmentUrl: (recordId: string, file: string) => Promise<string>
  attachmentText: (recordId: string, file: string) => Promise<string>
  addRecord: (record: MedRecord, files: File[]) => Promise<string | null>
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [index, setIndex] = useState<DataIndex | null>(null)
  const [reloadTick, setReloadTick] = useState(0)
  const urlCache = useRef(new Map<string, Promise<string>>())

  const source = useMemo(() => makeSource(settings), [settings.source, settings.github.owner, settings.github.repo, settings.github.branch, settings.github.token]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => applyTheme(settings.theme), [settings.theme])
  useEffect(() => applyDisplay(settings.textScale, settings.width), [settings.textScale, settings.width])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      saveSettings(next)
      return next
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    const configured = settings.source === 'local' || (settings.github.owner && settings.github.repo && settings.github.token)
    if (!configured) {
      setStatus('unconfigured')
      setIndex(null)
      return
    }
    setStatus('loading')
    setError(null)
    urlCache.current.clear()
    source
      .fetch('index.json')
      .then(async (res) => {
        if (!res.ok) throw new Error(res.status === 401 || res.status === 404 ? `Could not read index.json from ${source.label} (HTTP ${res.status}). Check the repository name, branch and token.` : `HTTP ${res.status}: ${await res.text()}`)
        return (await res.json()) as DataIndex
      })
      .then((data) => {
        if (cancelled) return
        setIndex(data)
        setStatus('ready')
      })
      .catch((e: Error) => {
        if (cancelled) return
        setError(e.message)
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [source, settings.source, settings.github.owner, settings.github.repo, settings.github.token, reloadTick])

  const attachmentUrl = useCallback(
    (recordId: string, file: string) => {
      const path = `attachments/${recordId}/${file}`
      let p = urlCache.current.get(path)
      if (!p) {
        p = source.fetch(path).then(async (res) => {
          if (!res.ok) throw new Error(`Could not load ${file} (HTTP ${res.status})`)
          return URL.createObjectURL(await res.blob())
        })
        urlCache.current.set(path, p)
      }
      return p
    },
    [source],
  )

  const attachmentText = useCallback(
    async (recordId: string, file: string) => {
      const res = await source.fetch(`attachments/${recordId}/${file}`)
      if (!res.ok) throw new Error(`Could not load ${file} (HTTP ${res.status})`)
      return res.text()
    },
    [source],
  )

  const addRecord = useCallback(
    async (record: MedRecord, files: File[]) => {
      for (const f of files) {
        const err = await source.put(`attachments/${record.id}/${f.name}`, f, `Add attachment ${f.name} to ${record.id}`)
        if (err) return err
      }
      const err = await source.put(`records/${record.id}.json`, JSON.stringify(record, null, 2) + '\n', `Add record ${record.id}`)
      if (err) return err
      if (source.kind === 'github' && index) {
        // The hosted app can't run the index script, so update index.json in place.
        const records = [...index.records.filter((r) => r.id !== record.id), record].sort((a, b) => (a.date < b.date ? 1 : -1))
        const next: DataIndex = { ...index, generatedAt: new Date().toISOString(), records }
        const e2 = await source.put('index.json', JSON.stringify(next, null, 2) + '\n', `Rebuild index for ${record.id}`)
        if (e2) return e2
      }
      setReloadTick((t) => t + 1)
      return null
    },
    [source, index],
  )

  const value: Store = {
    settings,
    updateSettings,
    source,
    status,
    error,
    index,
    reload: () => setReloadTick((t) => t + 1),
    attachmentUrl,
    attachmentText,
    addRecord,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside StoreProvider')
  return s
}
