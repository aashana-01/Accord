// Bottom-right chatbot: answers questions from the stored discussion (messages + points), with
// numbered sources. Clicking a source jumps to it on the map; "Discord" opens the original message.
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { useWorkspace } from '../state/workspace'
import { useI18n } from '../state/i18n'
import { api, channelId, errorMessage } from '../api'

interface Source {
  n: number
  type: 'message' | 'claim'
  id: string
  topic_id: string | null
  topic: string | null
  kind?: string
  author: string | null
  text: string
  discord_url: string | null
}
interface Turn {
  id: number
  role: 'you' | 'accord'
  text: string
  sources?: Source[]
  error?: boolean
}

const SUGGESTIONS = ['What did we decide?', 'Which questions are still open?', 'Who is doing what?']
const KIND = { decision: 'Decision', proposal: 'Proposal', question: 'Question', for: 'Point for', against: 'Point against' } as Record<
  string,
  string
>

export default function ChatBot() {
  const ws = useWorkspace()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const logRef = useRef<HTMLOListElement>(null)
  const ids = { panel: useId(), title: useId(), input: useId() }

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])
  useEffect(() => {
    logRef.current?.lastElementChild?.scrollIntoView({ block: 'end' })
  }, [turns, busy])

  const close = () => {
    setOpen(false)
    launcherRef.current?.focus()
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation() // don't also close the open conversation on the map
      close()
    }
  }

  const ask = async (question: string) => {
    const q = question.trim()
    if (!q || busy) return
    setInput('')
    setTurns((all) => [...all, { id: Date.now(), role: 'you', text: q }])
    setBusy(true)
    try {
      const res = await api.post<{ answer: string; sources: Source[] }>(`/channels/${channelId}/chat`, { question: q })
      setTurns((all) => [...all, { id: Date.now() + 1, role: 'accord', text: res.answer, sources: res.sources }])
    } catch (err) {
      setTurns((all) => [...all, { id: Date.now() + 1, role: 'accord', text: errorMessage(err), error: true }])
    } finally {
      setBusy(false)
      inputRef.current?.focus()
    }
  }

  const showOnMap = (s: Source) => {
    if (!s.topic_id) return
    ws.setViewMode('map')
    ws.setFocusId(s.topic_id)
  }

  // Turn "[1]" in the answer into a small button that jumps to that source
  const withCitations = (text: string, sources: Source[] = []): ReactNode[] =>
    text.split(/(\[\d+\])/g).map((part, i) => {
      const m = part.match(/^\[(\d+)\]$/)
      const src = m && sources.find((s) => s.n === Number(m[1]))
      if (!src) return part
      return (
        <button
          key={i}
          type="button"
          onClick={() => showOnMap(src)}
          className="mx-0.5 rounded px-1 align-super text-[10px] font-bold"
          style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
          aria-label={`${t('Source')} ${src.n}: ${t('show on map')}`}
        >
          {src.n}
        </button>
      )
    })

  // Poll/Actions panels use the right side of the screen; step aside while one is open
  if (ws.panel) return null

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-controls={ids.panel}
        className="btn btn-primary fixed right-4 bottom-4 z-40 !min-h-12 !rounded-full !px-4 shadow-xl"
      >
        <span aria-hidden className="text-lg">
          {open ? '✕' : '💬'}
        </span>
        <span className="hidden sm:inline">{open ? t('Close chat') : t('Ask Accord')}</span>
        <span className="sr-only sm:hidden">{open ? t('Close chat') : t('Ask Accord')}</span>
      </button>

      {open && (
        <div
          id={ids.panel}
          role="dialog"
          aria-labelledby={ids.title}
          onKeyDown={onKey}
          className="panel-enter fixed right-4 bottom-20 z-40 flex h-[min(540px,calc(100vh-7rem))] w-[min(400px,calc(100vw-2rem))] flex-col rounded-2xl border shadow-2xl"
          style={{ background: 'var(--surface)', color: 'var(--surface-fg)', borderColor: 'var(--border)' }}
        >
          <div className="border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
            <h2 id={ids.title} className="font-bold">
              {t('Ask Accord')}
            </h2>
            <p className="hint">{t('Answers come only from this channel, with sources.')}</p>
          </div>

          <ol ref={logRef} role="log" aria-live="polite" aria-label={t('Conversation with Accord')} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {turns.length === 0 && (
              <li className="text-sm">
                <p className="mb-2">{t('Ask anything about this chat. Try:')}</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" className="btn btn-ghost !min-h-8 !px-3 text-xs" onClick={() => ask(s)} disabled={!ws.backend}>
                      {t(s)}
                    </button>
                  ))}
                </div>
                {!ws.backend && (
                  <p className="hint mt-3">{t("The chatbot needs the Accord backend. Open the map from the bot's link in Discord.")}</p>
                )}
              </li>
            )}
            {turns.map((turn) => (
              <li key={turn.id} className={turn.role === 'you' ? 'flex justify-end' : ''}>
                <div
                  className="max-w-[90%] rounded-2xl px-3 py-2 text-sm"
                  style={
                    turn.role === 'you'
                      ? { background: 'var(--accent)', color: 'var(--on-accent)' }
                      : { background: 'var(--surface-2)', color: turn.error ? 'var(--danger)' : undefined }
                  }
                >
                  <span className="sr-only">{turn.role === 'you' ? t('You') : 'Accord'}: </span>
                  {turn.role === 'you' ? turn.text : withCitations(t(turn.text), turn.sources)}
                  {turn.sources && turn.sources.length > 0 && (
                    <ul className="mt-2 space-y-1.5 border-t pt-2" style={{ borderColor: 'var(--border)' }} aria-label={t('Sources')}>
                      {turn.sources.map((s) => (
                        <li key={s.n} className="text-xs">
                          <button
                            type="button"
                            className="text-left hover:underline disabled:no-underline"
                            onClick={() => showOnMap(s)}
                            disabled={!s.topic_id}
                          >
                            <span className="font-bold">[{s.n}]</span> {s.author ?? t(KIND[s.kind ?? ''] ?? 'Point')}: “
                            {(() => {
                              const x = t(s.text)
                              return x.length > 110 ? `${x.slice(0, 107)}…` : x
                            })()}
                            ”{s.topic ? ` · ${t(s.topic)}` : ''}
                          </button>
                          {s.discord_url && (
                            <button
                              type="button"
                              className="ml-1.5 font-semibold underline"
                              onClick={() => ws.confirmLeave(s.discord_url!)}
                              aria-label={`${t('Open source')} ${s.n} ${t('in Discord')}`}
                            >
                              Discord
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
            {busy && (
              <li className="hint" aria-live="off">
                {t('Thinking…')}
              </li>
            )}
          </ol>

          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault()
              ask(input)
            }}
            className="flex gap-2 border-t p-3"
            style={{ borderColor: 'var(--border)' }}
          >
            <label htmlFor={ids.input} className="sr-only">
              {t('Your question')}
            </label>
            <input
              id={ids.input}
              ref={inputRef}
              className="field"
              placeholder={t('Ask about this chat…')}
              maxLength={500}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!ws.backend}
            />
            <button type="submit" className="btn btn-primary" disabled={busy || !input.trim() || !ws.backend}>
              {t('Send')}
            </button>
          </form>
        </div>
      )}
    </>
  )
}
