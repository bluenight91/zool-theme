import type { DaySpan, OnlineDay, OnlineHistory, OnlinePeriod, PeriodGroup } from './model'

export interface OnlineHistoryPayload {
  max_days?: number
  days?: number
  timezone?: string
  window_start?: string
  window_end?: string
  total_online_seconds?: number
  online_rate?: number
  currently_online?: boolean
  last_active?: string | null
  periods?: { start?: string; end?: string; ongoing?: boolean }[] | null
  daily?: { date?: string; online_seconds?: number }[] | null
}

const pad = (n: number) => String(n).padStart(2, '0')

/** The next `YYYY-MM-DD`, as a calendar date rather than an instant. */
export function nextDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1, d + 1))
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`
}

export function timeZoneOf(name: string | undefined): string {
  if (!name) return 'UTC'
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: name }).format(0)
    return name
  } catch {
    return 'UTC'
  }
}

/** `YYYY-MM-DD` of an instant in a timezone. */
export function dateInZone(ms: number, timeZone: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(new Date(ms))
      .map((p) => [p.type, p.value]),
  )
  return `${parts.year}-${parts.month}-${parts.day}`
}

/**
 * UTC instant of midnight at the start of `date` in `timeZone`.
 * `date` is a calendar day, `YYYY-MM-DD`.
 */
export function zonedMidnight(date: string, timeZone: string): number {
  const [y, m, d] = date.split('-').map(Number)
  const target = Date.UTC(y, m - 1, d)
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  let guess = target
  for (let i = 0; i < 4; i++) {
    const parts = Object.fromEntries(fmt.formatToParts(new Date(guess)).map((p) => [p.type, p.value]))
    let year = Number(parts.year)
    let month = Number(parts.month)
    let day = Number(parts.day)
    let hour = Number(parts.hour)
    // Some engines report midnight as 24:00 on the previous date.
    if (hour === 24) {
      hour = 0
      const rolled = new Date(Date.UTC(year, month - 1, day + 1))
      year = rolled.getUTCFullYear()
      month = rolled.getUTCMonth() + 1
      day = rolled.getUTCDate()
    }
    const seen = Date.UTC(year, month - 1, day, hour, Number(parts.minute), Number(parts.second))
    const delta = seen - target
    if (delta === 0) return guess
    guess -= delta
  }
  return guess
}

function spans(start: number, end: number, pieces: { start: number; end: number }[]): DaySpan[] {
  const span = end - start
  if (!(span > 0)) return []
  const out: DaySpan[] = []
  for (const piece of pieces) {
    const from = Math.max(piece.start, start)
    const to = Math.min(piece.end, end)
    if (to > from) out.push({ from: (from - start) / span, to: (to - start) / span })
  }
  return out
}

/** Gaps between online periods, inside the statistics window. */
export function offlinePeriods(periods: OnlinePeriod[], windowStart: number, windowEnd: number): OnlinePeriod[] {
  const gaps: OnlinePeriod[] = []
  let cursor = windowStart
  for (const period of periods) {
    if (period.start > cursor) gaps.push({ start: cursor, end: period.start, ongoing: false })
    cursor = Math.max(cursor, period.end)
  }
  if (cursor < windowEnd) gaps.push({ start: cursor, end: windowEnd, ongoing: false })
  return gaps
}

/** Cut periods on midnight so each chip belongs to one calendar day. Newest day first. */
export function chipsByDay(periods: OnlinePeriod[], timeZone: string): PeriodGroup[] {
  const groups = new Map<string, PeriodGroup['chips']>()
  for (const period of periods) {
    let cursor = period.start
    let guard = 0
    while (cursor < period.end && guard < 4000) {
      guard++
      const date = dateInZone(cursor, timeZone)
      const dayEnd = zonedMidnight(nextDate(date), timeZone)
      const end = Math.min(period.end, dayEnd)
      if (!(end > cursor)) break
      const chips = groups.get(date) ?? []
      chips.push({ start: cursor, end, ongoing: period.ongoing && end >= period.end })
      groups.set(date, chips)
      cursor = end
    }
  }
  return [...groups.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, chips]) => ({ date, chips }))
}

/** Turn the dashboard's online-history payload into one track per calendar day. */
export function mapOnlineHistory(raw: OnlineHistoryPayload): OnlineHistory {
  const timeZone = timeZoneOf(raw.timezone)
  const windowStart = Date.parse(raw.window_start ?? '')
  const windowEnd = Date.parse(raw.window_end ?? '')
  const periods: OnlinePeriod[] = (raw.periods ?? [])
    .map((p) => ({ start: Date.parse(p.start ?? ''), end: Date.parse(p.end ?? ''), ongoing: Boolean(p.ongoing) }))
    .filter((p) => Number.isFinite(p.start) && Number.isFinite(p.end) && p.end > p.start)
    .sort((a, b) => a.start - b.start)
  const daily: OnlineDay[] = (raw.daily ?? [])
    .filter((d): d is { date: string; online_seconds?: number } => typeof d.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.date))
    .map((d) => {
      const start = zonedMidnight(d.date, timeZone)
      const end = zonedMidnight(nextDate(d.date), timeZone)
      const excluded: DaySpan[] = []
      const pending: DaySpan[] = []
      if (Number.isFinite(windowStart) && windowStart > start && windowStart < end) {
        excluded.push({ from: 0, to: (windowStart - start) / (end - start) })
      }
      let cutoff: number | null = null
      if (Number.isFinite(windowEnd) && windowEnd > start && windowEnd < end) {
        cutoff = (windowEnd - start) / (end - start)
        pending.push({ from: cutoff, to: 1 })
      }
      return {
        date: d.date,
        onlineSeconds: Math.max(0, d.online_seconds ?? 0),
        online: spans(start, end, periods),
        excluded,
        pending,
        cutoff,
      }
    })
  const onlineSeconds = Math.max(0, raw.total_online_seconds ?? daily.reduce((sum, d) => sum + d.onlineSeconds, 0))
  const windowSeconds = Number.isFinite(windowStart) && Number.isFinite(windowEnd) ? Math.max(0, (windowEnd - windowStart) / 1000) : 0
  const onlineRate = typeof raw.online_rate === 'number' ? raw.online_rate : windowSeconds > 0 ? (onlineSeconds / windowSeconds) * 100 : 0
  const lastActive = raw.last_active ? Date.parse(raw.last_active) : NaN
  return {
    maxDays: raw.max_days && raw.max_days > 0 ? raw.max_days : (raw.days ?? 1),
    timeZone,
    windowStart: Number.isFinite(windowStart) ? windowStart : 0,
    windowEnd: Number.isFinite(windowEnd) ? windowEnd : 0,
    onlineSeconds,
    offlineSeconds: Math.max(0, windowSeconds - onlineSeconds),
    onlineRate,
    currentlyOnline: Boolean(raw.currently_online),
    lastActive: Number.isFinite(lastActive) ? lastActive : null,
    periods,
    daily,
  }
}
