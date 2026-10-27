import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { adapter, useStore } from '@/app/store'
import { StatusDot } from '@/components/bits'
import { duration } from '@/core/format'
import type { OnlineHistory as OnlineHistoryData, PeriodGroup } from '@/core/model'
import { chipsByDay, dateInZone, offlinePeriods } from '@/core/online'

const DAY_OPTIONS = [1, 7, 30]

function DurationText({ seconds }: { seconds: number }) {
  const { t } = useTranslation()
  const d = duration(seconds)
  const parts: string[] = []
  if (d.days) parts.push(t('unit.days', { count: d.days }))
  if (d.hours) parts.push(`${d.hours}${t('unit.hourShort')}`)
  if (!d.days && (d.minutes || parts.length === 0)) parts.push(`${d.minutes}${t('unit.minuteShort')}`)
  return parts.join(' ')
}

function zoned(ms: number, timeZone: string, locale: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(locale, { timeZone, ...options }).format(ms)
}

function DayTrack({ day }: { day: OnlineHistoryData['daily'][number] }) {
  return (
    <div className="min-w-0">
      <div className="relative h-2 overflow-hidden rounded-full bg-wash">
        {day.excluded.map((span, i) => (
          <span
            key={`x${i}`}
            className="absolute inset-y-0"
            style={{
              left: `${span.from * 100}%`,
              width: `${(span.to - span.from) * 100}%`,
              background: 'repeating-linear-gradient(-45deg, transparent, transparent 2px, var(--line) 2px, var(--line) 3px)',
            }}
          />
        ))}
        {day.online.map((span, i) => (
          <span
            key={`o${i}`}
            className="absolute inset-y-0 bg-sage-text"
            style={{ left: `${span.from * 100}%`, width: `${Math.max((span.to - span.from) * 100, 0.6)}%` }}
          />
        ))}
        {day.cutoff !== null && (
          <span className="absolute inset-y-[-3px] w-px bg-ink" style={{ left: `${day.cutoff * 100}%` }} />
        )}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-faint">
        {[0, 6, 12, 18, 24].map((hour) => (
          <span key={hour}>{hour}</span>
        ))}
      </div>
    </div>
  )
}

function PeriodList({ groups, today, timeZone }: { groups: PeriodGroup[]; today: string; timeZone: string }) {
  const { t, i18n } = useTranslation()
  if (groups.length === 0) return <p className="mt-3 text-[13px] text-muted">{t('node.noPeriods')}</p>
  const clock = (ms: number) => zoned(ms, timeZone, i18n.language, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  return (
    <div className="mt-4 space-y-4">
      {groups.map((group) => (
        <div key={group.date}>
          <p className="text-[12px] text-muted">
            {group.date}
            {group.date === today && <span> · {t('node.today')}</span>}
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {group.chips.map((chip, i) => (
              <li key={i} className={`rounded-full border px-3 py-1 text-[12px] ${chip.ongoing ? 'border-sage-text/40 bg-wash' : 'border-line'}`}>
                <span className="num">
                  {clock(chip.start)} → {chip.ongoing ? t('node.ongoing') : clock(chip.end)}
                </span>
                <span className="ml-2 text-muted">
                  <DurationText seconds={Math.max(0, (chip.end - chip.start) / 1000)} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

/**
 * One online-history panel. The fetch is tied to the server and the day count,
 * and the result replaces the previous one; live metric frames must not add another copy.
 */
export function OnlineHistory({ serverId }: { serverId: string }) {
  const { t, i18n } = useTranslation()
  const loggedIn = useStore((s) => s.session.loggedIn)
  const load = adapter.loadOnlineHistory
  const [days, setDays] = useState(1)
  const [mode, setMode] = useState<'online' | 'offline'>('online')
  const [data, setData] = useState<OnlineHistoryData | null | undefined>(undefined)
  useEffect(() => {
    if (!load) return
    const limit = adapter.guestRangeHours
    if (limit != null && !loggedIn && days * 24 > limit) {
      setDays(1)
      return
    }
    let cancelled = false
    load(serverId, days)
      .then((next) => {
        if (!cancelled) setData(next)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
    return () => {
      cancelled = true
    }
  }, [load, serverId, days, loggedIn])

  if (!load || data === null) return null

  const maxDays = data?.maxDays ?? 30
  const limit = adapter.guestRangeHours
  const locked = (option: number) => option > maxDays || (limit != null && !loggedIn && option * 24 > limit)
  const range =
    data && data.windowStart > 0 && data.windowEnd > 0
      ? `${zoned(data.windowStart, data.timeZone, i18n.language, { month: '2-digit', day: '2-digit' })} – ${zoned(data.windowEnd, data.timeZone, i18n.language, { month: '2-digit', day: '2-digit' })}`
      : ''
  const today = data ? dateInZone(data.windowEnd || Date.now(), data.timeZone) : ''
  const groups = data ? chipsByDay(mode === 'online' ? data.periods : offlinePeriods(data.periods, data.windowStart, data.windowEnd), data.timeZone) : []

  return (
    <section data-online-history="" aria-label={t('node.onlineHistory')} aria-busy={data === undefined}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="mr-auto flex items-center gap-2 text-[20px] font-light tracking-[-0.02em]">
          {data && <StatusDot online={data.currentlyOnline} />}
          {t('node.onlineHistory')}
        </h2>
        <div className="flex gap-0.5" role="group" aria-label={t('node.onlineHistory')}>
          {DAY_OPTIONS.map((option) => {
            const disabled = locked(option)
            return (
              <button
                key={option}
                type="button"
                className={`pill min-h-8 px-3 ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
                aria-pressed={days === option}
                disabled={disabled}
                title={disabled && !loggedIn ? t('node.memberRange') : undefined}
                onClick={() => setDays(option)}
              >
                {t('node.rangeDays', { count: option })}
              </button>
            )
          })}
        </div>
      </div>

      {data === undefined ? (
        <div className="mt-4 h-24 animate-pulse rounded-[16px] bg-wash" />
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5 border-y border-line py-4 md:grid-cols-4">
            <div>
              <p className="text-[12px] text-muted">{t('node.onlineRate')}</p>
              <p className="num mt-1 text-[22px] leading-none font-light tracking-[-0.03em]">{data.onlineRate.toFixed(1)}%</p>
              <span className="mt-2 block h-1 overflow-hidden rounded-full bg-wash">
                <span className="block h-full bg-sage-text" style={{ width: `${Math.max(0, Math.min(100, data.onlineRate))}%` }} />
              </span>
            </div>
            <div>
              <p className="text-[12px] text-muted">{t('node.cumulativeOnline')}</p>
              <p className="num mt-1 text-[22px] leading-none font-light tracking-[-0.03em]">
                <DurationText seconds={data.onlineSeconds} />
              </p>
              <p className="num mt-2 text-[11px] text-faint">{range}</p>
            </div>
            <div>
              <p className="text-[12px] text-muted">{t('node.cumulativeOffline')}</p>
              <p className="num mt-1 text-[22px] leading-none font-light tracking-[-0.03em]">
                <DurationText seconds={data.offlineSeconds} />
              </p>
              <p className="num mt-2 text-[11px] text-faint">{range}</p>
            </div>
            <div>
              <p className="text-[12px] text-muted">{t('node.lastActive')}</p>
              <p className="num mt-1 text-[22px] leading-none font-light tracking-[-0.03em]">
                {data.lastActive ? zoned(data.lastActive, data.timeZone, i18n.language, { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }) : '—'}
              </p>
              <p className="num mt-2 text-[11px] text-faint">
                {data.lastActive ? zoned(data.lastActive, data.timeZone, i18n.language, { year: 'numeric', month: '2-digit', day: '2-digit' }) : ''}
              </p>
            </div>
          </div>

          <div className="card mt-4 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-[15px]">{t('node.dailyOnline')}</h3>
              <p className="text-[11px] text-faint">0:00 – 24:00 · {data.timeZone}</p>
            </div>
            <div className="mt-4 grid gap-5 md:grid-cols-2">
              {data.daily.map((day) => (
                <div key={day.date}>
                  <div className="mb-2 flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="num">{day.date}</span>
                    <span className="num text-muted">
                      <DurationText seconds={day.onlineSeconds} />
                    </span>
                  </div>
                  <DayTrack day={day} />
                </div>
              ))}
            </div>
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-muted">
              <li className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-4" style={{ background: 'repeating-linear-gradient(-45deg, transparent, transparent 2px, var(--line) 2px, var(--line) 3px)' }} />
                {t('node.notInStats')}
              </li>
              <li className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-4 rounded-full bg-wash" />
                {t('node.notYet')}
              </li>
              <li className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-4 rounded-full bg-sage-text" />
                {t('status.online')}
              </li>
              <li className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-px bg-ink" />
                {t('node.dataCutoff')}
              </li>
            </ul>
          </div>

          <div className="card mt-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-[15px]">{mode === 'online' ? t('node.periods') : t('node.periodsOffline')}</h3>
              <div className="flex rounded-full border border-line p-0.5" role="group">
                {(['online', 'offline'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={mode === option}
                    onClick={() => setMode(option)}
                    className={`h-7 rounded-full px-3 text-[12px] ${mode === option ? 'bg-ink text-paper' : 'text-muted hover:text-ink'}`}
                  >
                    {t(option === 'online' ? 'status.online' : 'status.offline')}
                  </button>
                ))}
              </div>
            </div>
            <PeriodList groups={groups} today={today} timeZone={data.timeZone} />
          </div>
        </>
      )}
    </section>
  )
}
