// Poll: create and publish a native Discord poll linked to a conversation or decision,
// and follow the results. When a poll ends, its winner becomes a Decision on the map.
import { useId, useState, type FormEvent } from 'react'
import { useWorkspace } from '../state/workspace'
import { api, channelId, errorMessage } from '../api'
import type { Poll } from '../types'
import Dialog from './ui/Dialog'
import Identity, { useIdentity } from './ui/Identity'
import LinkSelect, { parseLink } from './ui/LinkSelect'
import { useI18n } from '../state/i18n'

const DURATIONS = [
  { hours: 1, label: '1 hour' },
  { hours: 4, label: '4 hours' },
  { hours: 8, label: '8 hours' },
  { hours: 24, label: '1 day' },
  { hours: 72, label: '3 days' },
  { hours: 168, label: '1 week' },
]

function NewPollForm() {
  const ws = useWorkspace()
  const { t } = useI18n()
  const ids = { link: useId(), question: useId(), duration: useId(), error: useId() }
  const [link, setLink] = useState('')
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [duration, setDuration] = useState(24)
  const [multi, setMulti] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const identity = useIdentity(ws.info?.people ?? [])

  // Picking a question or proposal fills in a starting question
  const onLink = (value: string) => {
    setLink(value)
    const claim = ws.view.claims.find((c) => `claim:${c.id}` === value)
    if (claim && !question) setQuestion(claim.kind === 'question' ? claim.text : `${claim.text}?`)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    const filled = options.map((o) => o.trim()).filter(Boolean)
    if (!link) return setError('Choose what this poll is about.')
    if (!question.trim()) return setError('Write a question.')
    if (filled.length < 2) return setError('Add at least 2 options.')
    if (!identity.valid) return setError('Choose your name, or post anonymously.')
    const { topicId, claimId } = parseLink(link, ws.view)
    setBusy(true)
    try {
      const poll = await api.post<Poll>(`/channels/${channelId}/polls`, {
        question,
        options: filled,
        duration_hours: duration,
        allow_multiselect: multi,
        topic_id: topicId,
        claim_id: claimId,
        created_by: identity.createdBy,
      })
      ws.setPolls((p) => [poll, ...p])
      ws.toast('Poll published in Discord.', 'success')
      setQuestion('')
      setOptions(['', ''])
      setMulti(false)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" aria-describedby={error ? ids.error : undefined} noValidate>
      <div>
        <label htmlFor={ids.link} className="label">
          {t('About')}
        </label>
        <LinkSelect id={ids.link} view={ws.view} value={link} onChange={onLink} required />
      </div>
      <div>
        <label htmlFor={ids.question} className="label">
          {t('Question')}
        </label>
        <input id={ids.question} className="field" maxLength={300} value={question} onChange={(e) => setQuestion(e.target.value)} data-autofocus />
        <p className="hint mt-1">{question.length}/300</p>
      </div>
      <fieldset>
        <legend className="label">{t('Options (2 to 10)')}</legend>
        <ol className="space-y-2">
          {options.map((opt, i) => (
            <li key={i} className="flex gap-2">
              <input
                className="field"
                maxLength={55}
                aria-label={`${t('Option')} ${i + 1}`}
                value={opt}
                onChange={(e) => setOptions((o) => o.map((x, j) => (j === i ? e.target.value : x)))}
              />
              {options.length > 2 && (
                <button
                  type="button"
                  className="btn btn-ghost !px-2.5"
                  aria-label={`${t('Remove option')} ${i + 1}`}
                  onClick={() => setOptions((o) => o.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ol>
        {options.length < 10 && (
          <button type="button" className="btn btn-ghost mt-2" onClick={() => setOptions((o) => [...o, ''])}>
            {t('+ Add option')}
          </button>
        )}
      </fieldset>
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor={ids.duration} className="label">
            {t('Open for')}
          </label>
          <select id={ids.duration} className="field !w-auto" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            {DURATIONS.map((d) => (
              <option key={d.hours} value={d.hours}>
                {t(d.label)}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" checked={multi} onChange={(e) => setMulti(e.target.checked)} />
          {t('Allow multiple answers')}
        </label>
      </div>
      <Identity people={ws.info?.people ?? []} value={identity} />
      {error && (
        <p id={ids.error} role="alert" className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>
          {t(error)}
        </p>
      )}
      <button type="submit" className="btn btn-primary w-full" disabled={busy}>
        {t(busy ? 'Publishing…' : 'Publish poll in Discord')}
      </button>
    </form>
  )
}

function PollCard({ poll }: { poll: Poll }) {
  const ws = useWorkspace()
  const { t } = useI18n()
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [ending, setEnding] = useState(false)
  const endNow = async () => {
    setEnding(true)
    try {
      const updated = await api.post<Poll>(`/polls/${poll.id}/end`, {})
      ws.setPolls((all) => all.map((p) => (p.id === poll.id ? updated : p)))
      if (updated.decision_claim_id) {
        await ws.refreshView() // the winner is now a decision on the map
        ws.toast('Poll ended. The winner is now a decision on the map.', 'success')
      } else ws.toast('Poll ended. No single winner, so nothing changed on the map.')
    } catch (err) {
      ws.toast(errorMessage(err), 'error')
    } finally {
      setEnding(false)
      setConfirmEnd(false)
    }
  }
  const topic = ws.view.topics.find((t) => t.id === poll.topic_id)
  const total = poll.results.reduce((n, r) => n + r.votes, 0)
  const top = Math.max(0, ...poll.results.map((r) => r.votes))
  return (
    <li className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold">{t(poll.question)}</h4>
        <span
          className="shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold"
          style={{ borderColor: 'var(--border)', color: poll.status === 'open' ? 'var(--success)' : 'var(--surface-muted)' }}
        >
          {t(poll.status === 'open' ? 'Open' : 'Ended')}
        </span>
      </div>
      <p className="hint mt-0.5">
        {topic ? `${t('About')}: ${t(topic.title)}` : t('Not linked')} · {poll.created_by ?? t('anonymous')} · {total}{' '}
        {t(total === 1 ? 'vote' : 'votes')}
      </p>
      <ul className="mt-3 space-y-2" aria-label={t('Results')}>
        {poll.results.map((r) => {
          const pct = total ? Math.round((r.votes / total) * 100) : 0
          return (
            <li key={r.text} className="text-sm">
              <div className="flex justify-between gap-2">
                <span className={r.votes === top && top > 0 ? 'font-semibold' : ''}>{t(r.text)}</span>
                <span>
                  {r.votes} ({pct}%)
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full" style={{ background: 'var(--border)' }} aria-hidden>
                <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
              </div>
            </li>
          )
        })}
      </ul>
      {poll.decision_claim_id && (
        <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--success)' }}>
          {t('✓ Recorded as the decision on the map')}
        </p>
      )}
      {poll.status === 'closed' && !poll.decision_claim_id && (
        <p className="hint mt-2">{t(top === 0 ? 'No votes, so no decision.' : 'Tie, so the conversation stays Debating.')}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {topic && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              ws.openPanel(null)
              ws.setViewMode('map')
              ws.setFocusId(topic.id)
            }}
          >
            {t('Show on map')}
          </button>
        )}
        {poll.status === 'open' &&
          (confirmEnd ? (
            <>
              <button type="button" className="btn btn-primary" onClick={endNow} disabled={ending}>
                {t(ending ? 'Ending…' : 'Yes, end it now')}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmEnd(false)} disabled={ending}>
                {t('Cancel')}
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmEnd(true)}>
              {t('End poll now')}
            </button>
          ))}
        {poll.discord_url && (
          <button type="button" className="btn btn-ghost" onClick={() => ws.confirmLeave(poll.discord_url!)}>
            {t('View in Discord')}
          </button>
        )}
      </div>
    </li>
  )
}

export default function PollPanel() {
  const ws = useWorkspace()
  const { t } = useI18n()
  const [refreshing, setRefreshing] = useState(false)
  return (
    <Dialog
      open={ws.panel === 'poll'}
      onClose={() => ws.openPanel(null)}
      title="Poll"
      description="Publish a real Discord poll. When it ends, the winner becomes a decision on the map."
    >
      {!ws.backend ? (
        <p className="text-sm">
          {t("Polls need the Accord backend. Run /accord in Discord and open the map from the bot's link.")}
        </p>
      ) : (
        <div className="space-y-8">
          <section aria-labelledby="new-poll">
            <h3 id="new-poll" className="mb-3 font-bold">
              {t('New poll')}
            </h3>
            <NewPollForm />
          </section>
          <section aria-labelledby="poll-list">
            <div className="mb-3 flex items-center justify-between">
              <h3 id="poll-list" className="font-bold">
                {t('Polls in')} #{ws.view.channel.name}
              </h3>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={refreshing}
                onClick={async () => {
                  setRefreshing(true)
                  await ws.refreshPolls()
                  setRefreshing(false)
                  ws.toast('Poll results updated.')
                }}
              >
                {t(refreshing ? 'Refreshing…' : 'Refresh results')}
              </button>
            </div>
            {ws.polls.length === 0 ? (
              <p className="hint">{t('No polls yet.')}</p>
            ) : (
              <ul className="space-y-3">
                {ws.polls.map((p) => (
                  <PollCard key={p.id} poll={p} />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Dialog>
  )
}
