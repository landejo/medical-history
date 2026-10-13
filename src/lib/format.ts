const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function parseIso(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number)
  return { y, m, d }
}

/** "4 Mar 2024", or "Mar 2024" / "2024" when only the month or year is known. */
export function formatDate(iso?: string, precision: 'day' | 'month' | 'year' = 'day'): string {
  if (!iso) return ''
  const { y, m, d } = parseIso(iso)
  if (precision === 'year') return String(y)
  if (precision === 'month') return `${MONTHS[m - 1]} ${y}`
  return `${d} ${MONTHS[m - 1]} ${y}`
}

/** "Mar 2024" */
export function formatMonthYear(iso: string): string {
  const { y, m } = parseIso(iso)
  return `${MONTHS[m - 1]} ${y}`
}

/** "March 2024" */
export function formatMonthLong(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return `${MONTHS_LONG[m - 1]} ${y}`
}

/** Day-of-month and short weekday for the timeline gutter. */
export function dayParts(iso: string, precision: 'day' | 'month' | 'year' = 'day'): { day: string; weekday: string } {
  if (precision !== 'day') return { day: '—', weekday: 'approx' }
  const { y, m, d } = parseIso(iso)
  const date = new Date(Date.UTC(y, m - 1, d))
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getUTCDay()]
  return { day: String(d), weekday }
}

/** "Mar 2024 – Nov 2024" or "Mar 2024 – now" */
export function formatRange(start: string, end?: string, startPrecision: 'day' | 'month' | 'year' = 'day'): string {
  const a = startPrecision === 'year' ? start.slice(0, 4) : formatMonthYear(start)
  const b = end ? formatMonthYear(end) : 'now'
  return a === b ? a : `${a} – ${b}`
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Whole days from a to b (positive if b is after a). */
export function daysBetween(a: string, b: string): number {
  const pa = parseIso(a), pb = parseIso(b)
  return Math.round((Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 86400000)
}

export function plural(n: number, word: string, pluralWord = word + 's'): string {
  return `${n} ${n === 1 ? word : pluralWord}`
}
