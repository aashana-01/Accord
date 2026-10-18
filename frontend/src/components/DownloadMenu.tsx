// "Download" in the top-right: a PNG of the current view, or a PDF report of the whole channel.
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useWorkspace } from '../state/workspace'
import { useI18n, LANGUAGES } from '../state/i18n'
import { downloadPdf, downloadPng, fileStem, mapPng } from '../download'
import { errorMessage } from '../api'
import Menu from './ui/Menu'
import ListView from './ListView'
import accordLogo from '../assets/accord-logo.png'

function Report({ mapImage, onReady }: { mapImage: string | null; onReady: (node: HTMLElement) => void }) {
  const ws = useWorkspace()
  const { t, lang } = useI18n()
  const ref = useRef<HTMLDivElement>(null)
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady
  useEffect(() => {
    // wait a moment for images and fonts to settle, then take the picture once
    const timer = setTimeout(() => ref.current && onReadyRef.current(ref.current), 400)
    return () => clearTimeout(timer)
  }, [])
  const language = LANGUAGES.find((l) => l.code === lang)
  return (
    <div
      ref={ref}
      aria-hidden
      className="theme-light"
      style={{ position: 'fixed', left: -10000, top: 0, width: 794, background: '#ffffff', color: '#2b0012', padding: 32 }}
    >
      <div className="flex items-center gap-3 border-b pb-4" style={{ borderColor: '#e2d2d7' }} data-break>
        <img src={accordLogo} alt="" style={{ width: 44, height: 44, borderRadius: 8 }} />
        <div className="flex-1">
          <div className="text-xl font-bold">{t('Accord report')}</div>
          <div className="text-sm" style={{ color: '#6b5560' }}>
            {ws.serverName} · #{ws.view.channel.name} · {new Date().toLocaleString()}
            {language && language.code !== 'en' ? ` · ${language.native}` : ''}
          </div>
        </div>
      </div>
      {mapImage && (
        <section className="mt-4">
          <h2 className="mb-2 text-lg font-bold">{t('Mind map')}</h2>
          <img src={mapImage} alt="" style={{ width: '100%', borderRadius: 12, border: '1px solid #e2d2d7' }} />
        </section>
      )}
      <ListView printable />
    </div>
  )
}

export default function DownloadMenu() {
  const ws = useWorkspace()
  const { t } = useI18n()
  const [report, setReport] = useState<{ mapImage: string | null } | null>(null)
  const stem = fileStem(ws.view.channel.name)

  const png = async () => {
    const main = document.getElementById('main')
    if (!main) return
    try {
      await downloadPng(main, stem)
      ws.toast('Picture downloaded.', 'success')
    } catch (err) {
      ws.toast(`${t("Couldn't make the picture")}: ${errorMessage(err)}`, 'error')
    }
  }

  const pdf = async () => {
    ws.toast('Making the PDF report…')
    let mapImage: string | null = null
    const main = document.getElementById('main')
    if (ws.viewMode === 'map' && main) {
      try {
        mapImage = await mapPng(main)
      } catch {
        mapImage = null // the report still has every conversation
      }
    }
    setReport({ mapImage })
  }

  const onReady = async (node: HTMLElement) => {
    try {
      await downloadPdf(node, stem)
      ws.toast('PDF report downloaded.', 'success')
    } catch (err) {
      ws.toast(`${t("Couldn't make the PDF")}: ${errorMessage(err)}`, 'error')
    } finally {
      setReport(null)
    }
  }

  return (
    <>
      <Menu
        label={t('Download')}
        align="right"
        buttonClassName="btn btn-primary !min-h-9 !px-3 whitespace-nowrap"
        items={[
          { label: t('Picture of this view (PNG)'), onSelect: png },
          { label: t('Full report (PDF)'), onSelect: pdf },
        ]}
      />
      {report && createPortal(<Report mapImage={report.mapImage} onReady={onReady} />, document.body)}
    </>
  )
}
