// The same conversations as the map, as a plain list: easy to read with a screen reader or keyboard.
import { useWorkspace } from '../state/workspace'
import { NOT_SURE_BELOW } from '../theme'
import type { Claim, ClaimKind } from '../types'
import { useI18n } from '../state/i18n'

const groups: { kind: ClaimKind; title: string }[] = [
  { kind: 'decision', title: 'Decisions' },
  { kind: 'proposal', title: 'Proposals' },
  { kind: 'for', title: 'Points for' },
  { kind: 'against', title: 'Points against' },
  { kind: 'question', title: 'Questions' },
]

export default function ListView({ printable = false }: { printable?: boolean }) {
  const { view, tasks, polls, focusId, setFocusId, setViewMode } = useWorkspace()
  const byId = new Map(view.messages.map((m) => [m.id, m]))
  const { t } = useI18n()

  const describe = (c: Claim) => {
    const notes: string[] = []
    if (c.origin === 'poll') notes.push(t('decided by poll'))
    if ((c.confidence ?? 100) < NOT_SURE_BELOW) notes.push(t('AI not sure'))
    if (c.kind === 'question') notes.push(t(c.answer ? 'answered' : 'open'))
    return notes.length ? ` (${notes.join(', ')})` : ''
  }

  return (
    <div className={printable ? 'pt-6' : 'h-full overflow-y-auto px-4 py-6'} style={{ color: printable ? undefined : 'var(--on-bg)' }}>
      <div className={printable ? 'space-y-4' : 'mx-auto max-w-3xl space-y-6'}>
        <h2 className={printable ? 'text-lg font-bold' : 'text-2xl font-bold'}>
          {t('Conversations in')} #{view.channel.name} <span className="sr-only">({view.topics.length})</span>
        </h2>
        {view.topics.map((topic) => {
          const claims = view.claims.filter((c) => c.topic_id === topic.id)
          const replaced = new Set(claims.filter((c) => c.superseded_by).map((c) => c.id))
          const topicTasks = tasks.filter((t) => t.topic_id === topic.id)
          const topicPolls = polls.filter((p) => p.topic_id === topic.id)
          return (
            <article
              key={topic.id}
              aria-labelledby={`h-${topic.id}`}
              className="rounded-2xl border p-5 shadow-sm"
              style={{ background: 'var(--surface)', color: 'var(--surface-fg)', borderColor: focusId === topic.id ? 'var(--accent)' : 'var(--border)' }}
            >
              <h3 id={`h-${topic.id}`} className="text-lg font-bold">
                {t(topic.title)}
              </h3>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
                <dt className="font-semibold">{t('Activity')}</dt>
                <dd className="capitalize">{t(topic.activity)}</dd>
                {!topic.is_off_topic && (
                  <>
                    <dt className="font-semibold">{t('Status')}</dt>
                    <dd className="capitalize">{t(topic.status)}</dd>
                  </>
                )}
                <dt className="font-semibold">{t('Type')}</dt>
                <dd className="capitalize">{t(topic.is_off_topic ? 'Off-topic' : topic.kind)}</dd>
                <dt className="font-semibold">{t('Messages')}</dt>
                <dd>{topic.message_ids.length}</dd>
              </dl>

              {groups.map(({ kind, title }) => {
                const items = claims.filter((c) => c.kind === kind && !replaced.has(c.id))
                if (items.length === 0) return null
                return (
                  <section key={kind} className="mt-4">
                    <h4 className="text-sm font-bold">{t(title)}</h4>
                    <ul className="mt-1 list-disc space-y-2 pl-5 text-sm">
                      {items.map((c) => (
                        <li key={c.id}>
                          {t(c.text)}
                          {describe(c)}
                          {c.answer && <div>{t('Answer')}: {t(c.answer)}</div>}
                          {claims
                            .filter((old) => old.superseded_by === c.id)
                            .map((old) => (
                              <div key={old.id}>
                                {t('Replaced earlier decision')}: <s>{t(old.text)}</s>
                              </div>
                            ))}
                          {c.source_ids.some((id) => byId.has(id)) && (
                            <ul className="mt-1 space-y-0.5 text-xs" style={{ color: 'var(--surface-muted)' }} aria-label={t('Source messages')}>
                              {c.source_ids.map((id) => byId.get(id)).filter(Boolean).map((m) => (
                                <li key={m!.id}>
                                  {m!.author}: “{t(m!.content)}”
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                )
              })}

              {(topicTasks.length > 0 || topicPolls.length > 0) && (
                <p className="mt-4 text-sm">
                  {topicTasks.length > 0 && `${t('Tasks')}: ${topicTasks.filter((x) => x.status !== 'done').length} / ${topicTasks.length} ${t('not done')}. `}
                  {topicPolls.length > 0 && `${topicPolls.length} ${t(topicPolls.length === 1 ? 'poll' : 'polls')}.`}
                </p>
              )}

              {!printable && (
              <button
                type="button"
                className="btn btn-ghost mt-4"
                onClick={() => {
                  setFocusId(topic.id)
                  setViewMode('map')
                }}
              >
                {t('Show on map')}
              </button>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
