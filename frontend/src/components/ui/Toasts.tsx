// Short messages ("Poll published") read out by screen readers via a live region.
import { useWorkspace } from '../../state/workspace'
import { useI18n } from '../../state/i18n'

export default function Toasts() {
  const { toasts, dismissToast } = useWorkspace()
  const { t: tr } = useI18n()
  const color = { info: 'var(--surface-fg)', success: 'var(--success)', error: 'var(--danger)' }
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-4 left-4 z-[60] flex max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--surface-fg)' }}
        >
          <span aria-hidden style={{ color: color[t.kind] }}>
            {t.kind === 'success' ? '✓' : t.kind === 'error' ? '!' : 'i'}
          </span>
          <span className="flex-1">
            {t.kind === 'error' && <span className="sr-only">{tr('Error')}: </span>}
            {tr(t.text)}
          </span>
          <button type="button" onClick={() => dismissToast(t.id)} aria-label={tr('Dismiss message')} className="opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
