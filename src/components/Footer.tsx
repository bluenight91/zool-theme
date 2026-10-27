import { Trans } from 'react-i18next'
import { useStore } from '@/app/store'
import { Wordmark } from './Brand'

export function Footer() {
  const note = useStore((s) => s.settings.footerNote)
  const hideWordmark = useStore((s) => s.settings.hideWordmark)

  return (
    <footer className="mt-24 border-t border-line">
      <div className="wrap flex flex-col gap-4 pt-10 pb-8 md:flex-row md:items-center md:justify-end">
        {note && <p className="mr-auto text-[13px] text-ink">{note}</p>}
        <p className="text-[12px] text-muted">
          <Trans
            i18nKey="app.productBy"
            components={{
              link: <a className="text-ink underline-offset-4 hover:underline" href="https://x.com/luoleiorg" target="_blank" rel="noreferrer">@luoleiorg</a>,
            }}
          />
        </p>
      </div>
      {/* The closing wordmark from the ZOOL site, cropped so it rises from the page edge. */}
      <div
        data-zool="wordmark"
        className={`wrap h-[clamp(40px,9vw,112px)] overflow-hidden ${hideWordmark ? 'hidden' : ''}`}
        aria-hidden="true"
      >
        <Wordmark className="h-auto w-full translate-y-[12%] text-wash" />
      </div>
    </footer>
  )
}
