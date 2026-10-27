import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { adapter, useStore } from '@/app/store'
import { duration } from '@/core/format'
import type { OnlineHistory as OnlineHistoryData } from '@/core/model'

const DAY_OPTIONS = [1, 7, 30]

function DurationText({ seconds }: { seconds: number }) {
  const { t } = useTranslation()
  const d = duration(seconds)
  const parts: string[] = []
  if (d.days) parts.push(t('unit.days', { count: d.days }))
  if (d.hours) parts.push(`${d.hours}${t('unit.hourShort')}`)
  if (d.minutes || parts.length === 0) parts.push(`${d.minutes}${t('unit.minuteShort')}`)
  return parts.join(' ')
}

function dayLabel(date: string, locale: string) {
  const [y, m, d] = date.split('-').map(Number)
  return new Intl.DateTimeFormat(locale, { month: 'numeric', day: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)))
}

/**
 * Uptime from the dashboard's online-history API. Signed-out visitors only receive
 * one day; longer choices stay on screen so it is obvious what signing in adds.
 */
export function OnlineHistory({ serverId }: { serverId: string }) {
  const { t, i18n } = useTranslation()
  const loggedIn = useStore((s) => s.session.loggedIn)
  const load = adapter.loadOnlineHistory
  const [days, setDays] = useState(1)
  const [data, setData] = useState<OnlineHistoryData | null | undefined>(undefined)

  useEffect(() => {
    if (!load) return
    if (!loggedIn && days > 1) {
      setDays(1)
      return
    }
    let cancelled = false
    load(serverId, days)
      .then((next) => {
        if (cancelled) return
        setData((current) => next ?? (current === undefined ? null : current))
      })
      .catch(() => {
        if (!cancelled) setData((current) => (current === undefined ? null : current))
      })
    return () => {
      cancelled = true
    }
  }, [load, serverId, days, loggedIn])

  if (!load || data === null) return null

  const maxDays = data?.maxDays ?? (loggedIn ? 30 : 1)
  const locked = (option: number) => option > maxDays || (!loggedIn && option > 1)

  return (
    <section className="mt-14" aria-label={t('node.onlineHistory')} aria-busy={data === undefined}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="mr-auto text-[20px] font-light tracking-[-0.02em]">{t('node.onlineHistory')}</h2>
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
                title={disabled && !loggedIn && option > 1 ? t('node.memberRange') : undefined}
                onClick={() => setDays(option)}
              >
                {t('node.rangeDays', { count: option })}
              </button>
            )
          })}
        </div>
      </div>

      {data === undefined ? (
        <div className="mt-4 h-16 animate-pulse rounded-[16px] bg-wash" />
      ) : (
        <>
          <div className="mt-4 grid grid-cols-3 gap-4 border-y border-line py-4">
            <div>
              <p className="text-[12px] text-muted">{t('node.onlineRate')}</p>
              <p className="num mt-1 text-[22px] font-light tracking-[-0.03em]">{data.onlineRate.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-[12px] text-muted">{t('node.onlineFor')}</p>
              <p className="num mt-1 text-[22px] font-light tracking-[-0.03em]"><DurationText seconds={data.onlineSeconds} /></p>
            </div>
            <div>
              <p className="text-[12px] text-muted">{t('node.offlineFor')}</p>
              <p className="num mt-1 text-[22px] font-light tracking-[-0.03em]"><DurationText seconds={data.offlineSeconds} /></p>
            </div>
          </div>
          <ul className="mt-4 space-y-1.5">
            {data.daily.map((day) => (
              <li key={day.date} className="flex items-center gap-3">
                <span className="num w-12 shrink-0 text-right text-[12px] text-muted">{dayLabel(day.date, i18n.language)}</span>
                <span className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-wash">
                  {day.segments.map((seg, i) => (
                    <span
                      key={i}
                      className="absolute inset-y-0 bg-sage-text"
                      style={{ left: `${seg.from * 100}%`, width: `${Math.max((seg.to - seg.from) * 100, 0.8)}%` }}
                    />
                  ))}
                </span>
                <span className="num w-24 shrink-0 text-right text-[12px] text-muted"><DurationText seconds={day.onlineSeconds} /></span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
