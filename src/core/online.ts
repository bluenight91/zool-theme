import type { OnlineDay, OnlineHistory } from './model'

export interface OnlineHistoryPayload {
  max_days?: number
  days?: number
  timezone?: string
  window_start?: string
  window_end?: string
  total_online_seconds?: number
  online_rate?: number
  periods?: { start?: string; end?: string }[] | null
  daily?: { date?: string; online_seconds?: number }[] | null
}

const pad = (n: number) => String(n).padStart(2, '0')

/** The next `YYYY-MM-DD`, as a calendar date rather than an instant. */
export function nextDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1, d + 1))
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`
}

function timeZoneOf(name: string | undefined): string {
  if (!name) return 'UTC'
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: name }).format(0)
    return name
  } catch {
    return 'UTC'
  }
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

function segments(start: number, end: number, periods: { start: number; end: number }[]): OnlineDay['segments'] {
  const span = end - start
  if (!(span > 0)) return []
  const out: OnlineDay['segments'] = []
  for (const period of periods) {
    const from = Math.max(period.start, start)
    const to = Math.min(period.end, end)
    if (to > from) out.push({ from: (from - start) / span, to: (to - start) / span })
  }
  return out
}

/** Turn the dashboard's online-history payload into one row per calendar day. */
export function mapOnlineHistory(raw: OnlineHistoryPayload): OnlineHistory {
  const timeZone = timeZoneOf(raw.timezone)
  const periods = (raw.periods ?? [])
    .map((p) => ({ start: Date.parse(p.start ?? ''), end: Date.parse(p.end ?? '') }))
    .filter((p) => Number.isFinite(p.start) && Number.isFinite(p.end) && p.end > p.start)
  const daily: OnlineDay[] = (raw.daily ?? [])
    .filter((d): d is { date: string; online_seconds?: number } => typeof d.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.date))
    .map((d) => {
      const start = zonedMidnight(d.date, timeZone)
      return {
        date: d.date,
        onlineSeconds: Math.max(0, d.online_seconds ?? 0),
        segments: segments(start, zonedMidnight(nextDate(d.date), timeZone), periods),
      }
    })
  const onlineSeconds = Math.max(0, raw.total_online_seconds ?? daily.reduce((sum, d) => sum + d.onlineSeconds, 0))
  const windowStart = Date.parse(raw.window_start ?? '')
  const windowEnd = Date.parse(raw.window_end ?? '')
  const windowSeconds = Number.isFinite(windowStart) && Number.isFinite(windowEnd) ? Math.max(0, (windowEnd - windowStart) / 1000) : 0
  const onlineRate = typeof raw.online_rate === 'number' ? raw.online_rate : windowSeconds > 0 ? (onlineSeconds / windowSeconds) * 100 : 0
  return {
    maxDays: raw.max_days && raw.max_days > 0 ? raw.max_days : (raw.days ?? 1),
    timeZone,
    onlineSeconds,
    offlineSeconds: Math.max(0, windowSeconds - onlineSeconds),
    onlineRate,
    daily,
  }
}
