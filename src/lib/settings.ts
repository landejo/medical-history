export type ClaudeModel = 'claude-opus-5-5' | 'claude-sonnet-5-5' | 'claude-haiku-5-5'

export const MODEL_OPTIONS: { id: ClaudeModel; label: string; note: string }[] = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', note: 'Most capable, default' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', note: 'Faster and cheaper' },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5', note: 'Fastest, lowest cost' },
]

export interface Settings {
  /** Where records come from. In dev the default is the local data server; in the hosted build it's GitHub. */
  source: 'local' | 'github'
  github: { owner: string; repo: string; branch: string; token: string }
  anthropic: { apiKey: string; model: ClaudeModel }
  theme: 'system' | 'light' | 'dark'
}

const KEY = 'mh.settings.v1'

export const DEFAULT_SETTINGS: Settings = {
  source: import.meta.env.DEV ? 'local' : 'github',
  github: {
    owner: import.meta.env.VITE_DATA_OWNER ?? '',
    repo: import.meta.env.VITE_DATA_REPO ?? '',
    branch: import.meta.env.VITE_DATA_BRANCH ?? 'main',
    token: '',
  },
  anthropic: { apiKey: '', model: 'claude-opus-5-5' },
  theme: 'system',
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return structuredClone(DEFAULT_SETTINGS)
    const parsed = JSON.parse(raw) as Partial<Settings>
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      github: { ...DEFAULT_SETTINGS.github, ...(parsed.github ?? {}) },
      anthropic: { ...DEFAULT_SETTINGS.anthropic, ...(parsed.anthropic ?? {}) },
    }
  } catch {
    return structuredClone(DEFAULT_SETTINGS)
  }
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* private mode or storage blocked: settings live for this page only */
  }
}

export function applyTheme(theme: Settings['theme']) {
  const root = document.documentElement
  if (theme === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
}
