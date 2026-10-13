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
  /** Multiplier for all text sizes; layout widths stay put. */
  textScale: number
  /** Maximum width of the main page column. */
  width: 'standard' | 'wide' | 'full'
  /** Show the horizontal overview strip above the timeline list. */
  showOverview: boolean
}

export const TEXT_SCALES: { value: number; label: string }[] = [
  { value: 0.9, label: 'Small' },
  { value: 1, label: 'Default' },
  { value: 1.12, label: 'Large' },
  { value: 1.25, label: 'Larger' },
  { value: 1.4, label: 'Largest' },
]

export const WIDTHS: { value: Settings['width']; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'wide', label: 'Wide' },
  { value: 'full', label: 'Full' },
]

/** Next step up or down the text scale, clamped to the ends. */
export function stepTextScale(current: number, dir: 1 | -1): number {
  const i = TEXT_SCALES.findIndex((s) => s.value >= current - 1e-6)
  const at = i === -1 ? TEXT_SCALES.length - 1 : i
  return TEXT_SCALES[Math.max(0, Math.min(TEXT_SCALES.length - 1, at + dir))].value
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
  textScale: 1,
  width: 'wide',
  showOverview: true,
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

export function applyDisplay(textScale: number, width: Settings['width']) {
  const root = document.documentElement
  root.style.setProperty('--text-scale', String(textScale))
  root.setAttribute('data-width', width)
}
