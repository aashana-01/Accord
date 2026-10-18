// Accessible dialog: moves focus inside, keeps Tab inside, Esc closes, and gives focus back on close.
// variant "panel" slides in from the right over the map; "modal" is a small centered box.
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { useI18n } from '../../state/i18n'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  variant?: 'panel' | 'modal'
  children: ReactNode
  footer?: ReactNode
}

export default function Dialog({ open, onClose, title, description, variant = 'panel', children, footer }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  // keep the latest onClose without re-running the focus logic on every render (typing would lose focus)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const titleId = useId()
  const descId = useId()
  const { t } = useI18n()

  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    const node = ref.current
    // focus the first field (or the dialog itself) once it's on screen
    const first = node?.querySelector<HTMLElement>('[data-autofocus]') ?? node?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? node)?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
      }
      if (e.key !== 'Tab' || !node) return
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null)
      if (items.length === 0) return
      const firstEl = items[0]
      const lastEl = items[items.length - 1]
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      opener?.focus?.()
    }
  }, [open])

  if (!open) return null

  const box =
    variant === 'panel'
      ? 'panel-enter fixed top-14 right-0 bottom-0 z-40 flex w-full max-w-[460px] flex-col border-l'
      : 'fixed top-1/2 left-1/2 z-50 flex w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border'

  return (
    <>
      <div
        className={`fixed inset-0 ${variant === 'panel' ? 'top-14 z-30' : 'z-50'}`}
        style={{ background: 'var(--overlay)' }}
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={`${box} shadow-2xl`}
        style={{ background: 'var(--surface)', color: 'var(--surface-fg)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-start justify-between gap-3 border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 id={titleId} className="text-lg font-bold">
              {t(title)}
            </h2>
            {description && (
              <p id={descId} className="mt-0.5 text-sm" style={{ color: 'var(--surface-muted)' }}>
                {t(description)}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost !min-h-9 !px-2.5" aria-label={`${t('Close')} ${t(title)}`}>
            <span aria-hidden>✕</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t px-5 py-3" style={{ borderColor: 'var(--border)' }}>
            {footer}
          </div>
        )}
      </div>
    </>
  )
}
