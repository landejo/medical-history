import { useEffect, useState } from 'react'

export type Route =
  | { name: 'timeline'; recordId?: string }
  | { name: 'episodes'; episodeId?: string; recordId?: string }
  | { name: 'trends' }
  | { name: 'profile' }
  | { name: 'share' }
  | { name: 'add'; episodeId?: string }
  | { name: 'settings' }

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean).map(decodeURIComponent)
  switch (parts[0]) {
    case 'episodes':
      return { name: 'episodes', episodeId: parts[1], recordId: parts[2] === 'r' ? parts[3] : undefined }
    case 'trends':
      return { name: 'trends' }
    case 'profile':
      return { name: 'profile' }
    case 'share':
      return { name: 'share' }
    case 'add':
      return { name: 'add', episodeId: parts[1] }
    case 'settings':
      return { name: 'settings' }
    default:
      return { name: 'timeline', recordId: parts[1] === 'r' ? parts[2] : undefined }
  }
}

export function hrefFor(route: Route): string {
  switch (route.name) {
    case 'timeline':
      return route.recordId ? `#/timeline/r/${route.recordId}` : '#/timeline'
    case 'episodes':
      if (route.episodeId && route.recordId) return `#/episodes/${route.episodeId}/r/${route.recordId}`
      return route.episodeId ? `#/episodes/${route.episodeId}` : '#/episodes'
    case 'add':
      return route.episodeId ? `#/add/${route.episodeId}` : '#/add'
    default:
      return `#/${route.name}`
  }
}

export function navigate(route: Route) {
  window.location.hash = hrefFor(route)
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
