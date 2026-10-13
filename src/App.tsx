import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { DetailPanel } from './components/DetailPanel'
import { MobileBar, Sidebar } from './components/Sidebar'
import { StoreProvider, useStore } from './data/store'
import { hrefFor, useRoute } from './lib/router'
import type { MedRecord } from './types'
import { UiCtx } from './ui'
import { AddRecordView } from './views/AddRecordView'
import { ConnectView } from './views/ConnectView'
import { EpisodeView, EpisodesView } from './views/EpisodesView'
import { ProfileView } from './views/ProfileView'
import { SettingsView } from './views/SettingsView'
import { ShareView } from './views/ShareView'
import { TimelineView } from './views/TimelineView'
import { TrendsView } from './views/TrendsView'

const ChatDrawer = lazy(() => import('./components/ChatDrawer').then((m) => ({ default: m.ChatDrawer })))

function Shell() {
  const route = useRoute()
  const { index, status, error, settings, reload } = useStore()
  const [chat, setChat] = useState<{ open: boolean; focus?: MedRecord }>({ open: false })
  const openChat = useCallback((focus?: MedRecord) => setChat({ open: true, focus }), [])
  const pageKey = route.name + ('episodeId' in route ? route.episodeId ?? '' : '')
  useEffect(() => {
    document.querySelector('.main')?.scrollTo({ top: 0 })
  }, [pageKey])

  if (status === 'unconfigured' && route.name !== 'settings') return <ConnectView />
  if (status === 'loading' || status === 'idle') return <div className="connect"><p className="muted">Loading records…</p></div>
  if (status === 'error' && route.name !== 'settings')
    return (
      <div className="connect">
        <h1>Couldn't load records</h1>
        <div className="notice error">{error}</div>
        <div className="row">
          <button className="btn" onClick={reload}>Try again</button>
          <a className="btn ghost" href={hrefFor({ name: 'settings' })}>Settings</a>
        </div>
      </div>
    )

  const recordId = route.name === 'timeline' || route.name === 'episodes' ? route.recordId : undefined
  const record = recordId ? index?.records.find((r) => r.id === recordId) : undefined
  const closeHref = route.name === 'episodes' ? hrefFor({ name: 'episodes', episodeId: route.episodeId }) : hrefFor({ name: 'timeline' })

  let view: React.ReactNode
  switch (route.name) {
    case 'episodes':
      view = route.episodeId ? <EpisodeView episodeId={route.episodeId} activeId={recordId} /> : <EpisodesView />
      break
    case 'trends':
      view = <TrendsView />
      break
    case 'profile':
      view = <ProfileView />
      break
    case 'share':
      view = <ShareView />
      break
    case 'add':
      view = <AddRecordView episodeId={route.episodeId} />
      break
    case 'settings':
      view = <SettingsView />
      break
    default:
      view = <TimelineView activeId={recordId} />
  }

  return (
    <UiCtx.Provider value={{ openChat }}>
      <div className={`shell ${record ? 'with-detail' : ''}`}>
        <Sidebar route={route} />
        <main className="main">{view}</main>
        {record && <DetailPanel record={record} closeHref={closeHref} />}
      </div>
      <MobileBar route={route} />
      {chat.open && index && (
        <Suspense fallback={null}>
          <ChatDrawer index={index} settings={settings} focus={chat.focus} onClose={() => setChat({ open: false })} />
        </Suspense>
      )}
    </UiCtx.Provider>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
