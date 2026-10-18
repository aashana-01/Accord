// Top bar: Accord logo + name, the menu (MindMap | Actions | Poll | Translation | Mode),
// and the SAMURAI logo, server name and Download on the right.
import { useWorkspace } from '../state/workspace'
import { LANGUAGES, useI18n } from '../state/i18n'
import Menu from './ui/Menu'
import DownloadMenu from './DownloadMenu'
import accordLogo from '../assets/accord-logo.png'
import samuraiLight from '../assets/samurai-light.png'
import samuraiDark from '../assets/samurai-dark.png'

const navButton =
  'btn !min-h-9 !px-2 sm:!px-3 !font-medium hover:bg-[var(--surface-2)] aria-expanded:bg-[var(--surface-2)] whitespace-nowrap'

export default function Header() {
  const ws = useWorkspace()
  const { viewMode, setViewMode, setFocusId, panel, openPanel, themePref, setThemePref, theme, serverName, view } = ws
  const { t, lang, setLang, translating } = useI18n()

  return (
    <header
      className="flex min-h-14 shrink-0 flex-wrap items-center gap-2 border-b px-3 py-1"
      style={{ background: 'var(--header-bg)', color: 'var(--header-fg)', borderColor: 'var(--header-border)' }}
    >
      {/* Far left: logo + project name */}
      <div className="flex shrink-0 items-center gap-2 sm:pr-2">
        <img src={accordLogo} alt="" className="h-9 w-9 rounded-md" />
        <h1 className="sr-only text-lg font-bold tracking-tight sm:not-sr-only">Accord</h1>
      </div>

      <nav aria-label={t('Workspace')} className="min-w-0 flex-1">
        <ul className="flex flex-wrap items-center gap-0.5 sm:gap-1">
          <li>
            <Menu
              label={t('MindMap')}
              buttonClassName={navButton}
              items={[
                {
                  label: t('All conversations'),
                  onSelect: () => {
                    setFocusId(null)
                    openPanel(null)
                  },
                },
                { label: t('Map view'), checked: viewMode === 'map', onSelect: () => setViewMode('map') },
                { label: t('List view'), checked: viewMode === 'list', onSelect: () => setViewMode('list'), hint: t('screen-reader friendly') },
              ]}
            />
          </li>
          <li>
            <button
              type="button"
              className={navButton}
              aria-haspopup="dialog"
              aria-expanded={panel === 'actions'}
              onClick={() => openPanel(panel === 'actions' ? null : 'actions')}
            >
              {t('Actions')}
            </button>
          </li>
          <li>
            <button
              type="button"
              className={navButton}
              aria-haspopup="dialog"
              aria-expanded={panel === 'poll'}
              onClick={() => openPanel(panel === 'poll' ? null : 'poll')}
            >
              {t('Poll')}
            </button>
          </li>
          <li>
            <Menu
              label={t('Translation')}
              buttonClassName={navButton}
              items={LANGUAGES.map((l) => ({
                label: l.native,
                lang: l.code,
                hint: l.code === 'en' ? t('original') : l.name,
                checked: lang === l.code,
                onSelect: () => setLang(l.code),
              }))}
            />
          </li>
          <li>
            <Menu
              label={t('Mode')}
              align="right"
              buttonClassName={navButton}
              items={[
                { label: t('Match my computer'), checked: themePref === 'system', onSelect: () => setThemePref('system'), hint: t(theme) },
                { label: t('Light'), checked: themePref === 'light', onSelect: () => setThemePref('light') },
                { label: t('Dark'), checked: themePref === 'dark', onSelect: () => setThemePref('dark') },
              ]}
            />
          </li>
          <li aria-live="polite" className="px-1 text-xs" style={{ color: 'var(--surface-muted)' }}>
            {translating ? t('Translating…') : ''}
          </li>
        </ul>
      </nav>

      {/* Right: team logo, server name, download */}
      <div className="flex shrink-0 items-center gap-3">
        <img
          src={theme === 'dark' ? samuraiDark : samuraiLight}
          alt="Team SAMURAI"
          className="hidden h-10 w-auto select-none lg:block"
          draggable={false}
        />
        <div className="hidden min-w-0 text-right leading-tight sm:block">
          <span className="sr-only">{t('Server')}: </span>
          <div className="max-w-56 truncate text-sm font-semibold" title={serverName}>
            {serverName}
          </div>
          <div className="max-w-56 truncate text-xs" style={{ color: 'var(--surface-muted)' }}>
            <bdi dir="ltr">#{view.channel.name}</bdi>
          </div>
        </div>
        <DownloadMenu />
      </div>
    </header>
  )
}
