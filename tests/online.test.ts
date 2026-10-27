import { describe, expect, it } from 'vitest'
import { chipsByDay, mapOnlineHistory, offlinePeriods, zonedMidnight } from '../src/core/online'
import { togglePing } from '../src/core/ping'

describe('online history', () => {
  it('places midnight in the dashboard timezone', () => {
    expect(zonedMidnight('2026-10-27', 'Asia/Shanghai')).toBe(Date.parse('2026-10-26T16:00:00.000Z'))
  })

  it('marks the part of a day outside the window and keeps one panel of days', () => {
    const history = mapOnlineHistory({
      timezone: 'Asia/Shanghai',
      max_days: 30,
      window_start: '2026-10-26T16:00:00.000Z',
      window_end: '2026-10-28T04:00:00.000Z',
      total_online_seconds: 24 * 3600,
      online_rate: 50,
      currently_online: true,
      last_active: '2026-10-28T04:00:00.000Z',
      periods: [{ start: '2026-10-26T20:00:00.000Z', end: '2026-10-27T20:00:00.000Z', ongoing: false }],
      daily: [
        { date: '2026-10-27', online_seconds: 20 * 3600 },
        { date: '2026-10-28', online_seconds: 4 * 3600 },
      ],
    })
    expect(history.daily).toHaveLength(2)
    expect(history.currentlyOnline).toBe(true)
    expect(history.daily[0].online).toEqual([{ from: 4 / 24, to: 1 }])
    expect(history.daily[0].excluded).toEqual([])
    expect(history.daily[1].online[0].from).toBe(0)
    expect(history.daily[1].online[0].to).toBeCloseTo(4 / 24)
    expect(history.daily[1].pending[0].from).toBeCloseTo(0.5)
  })

  it('splits a session at midnight and finds the offline gap', () => {
    const history = mapOnlineHistory({
      timezone: 'Asia/Shanghai',
      window_start: '2026-10-26T16:00:00.000Z',
      window_end: '2026-10-27T16:00:00.000Z',
      periods: [{ start: '2026-10-26T18:00:00.000Z', end: '2026-10-27T02:00:00.000Z', ongoing: false }],
      daily: [{ date: '2026-10-27', online_seconds: 8 * 3600 }],
    })
    const groups = chipsByDay(history.periods, history.timeZone)
    expect(groups.map((group) => group.date)).toEqual(['2026-10-27'])
    expect(groups[0].chips).toHaveLength(1)
    expect(offlinePeriods(history.periods, history.windowStart, history.windowEnd)).toHaveLength(2)
  })
})

describe('latency selection', () => {
  it('starts from all, solos the first click, and adds the next', () => {
    expect(togglePing([], 4)).toEqual([4])
    expect(togglePing([4], 9)).toEqual([4, 9])
    expect(togglePing([4, 9], 4)).toEqual([9])
    expect(togglePing([9], 9)).toEqual([])
  })
})
