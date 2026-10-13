import { describe, expect, it } from 'vitest'
import { hrefFor, parseHash } from './router'

describe('router', () => {
  it('round-trips routes through the hash', () => {
    const routes = [
      { name: 'timeline' as const },
      { name: 'timeline' as const, recordId: '2024-03-14-knee-mri' },
      { name: 'episodes' as const, episodeId: 'acl' },
      { name: 'episodes' as const, episodeId: 'acl', recordId: 'x' },
      { name: 'add' as const, episodeId: 'acl' },
      { name: 'settings' as const },
    ]
    for (const r of routes) expect(parseHash(hrefFor(r))).toEqual(r)
  })
  it('ignores a query string after the route', () => {
    expect(parseHash('#/share?r=abc')).toEqual({ name: 'share' })
  })
  it('defaults to the timeline', () => {
    expect(parseHash('')).toEqual({ name: 'timeline', recordId: undefined })
    expect(parseHash('#/nonsense')).toEqual({ name: 'timeline', recordId: undefined })
  })
})
