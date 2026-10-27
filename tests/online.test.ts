import { describe, expect, it } from 'vitest'
import { mapOnlineHistory, zonedMidnight } from '../src/core/online'

describe('online history', () => {
  it('places midnight in the dashboard timezone', () => {
    expect(zonedMidnight('2026-10-27', 'Asia/Shanghai')).toBe(Date.parse('2026-10-26T16:00:00.000Z'))
  })

  it('splits a session across the calendar days it covers', () => {
    const history = mapOnlineHistory({
      timezone: 'Asia/Shanghai',
      max_days: 30,
      window_start: '2026-10-26T16:00:00.000Z',
      window_end: '2026-10-28T16:00:00.000Z',
      total_online_seconds: 24 * 3600,
      online_rate: 50,
      periods: [{ start: '2026-10-26T20:00:00.000Z', end: '2026-10-27T20:00:00.000Z' }],
      daily: [
        { date: '2026-10-27', online_seconds: 20 * 3600 },
        { date: '2026-10-28', online_seconds: 4 * 3600 },
      ],
    })
    expect(history.onlineRate).toBe(50)
    expect(history.offlineSeconds).toBe(24 * 3600)
    expect(history.daily[0].segments).toEqual([{ from: 4 / 24, to: 1 }])
    expect(history.daily[1].segments[0].from).toBe(0)
    expect(history.daily[1].segments[0].to).toBeCloseTo(4 / 24)
  })
})