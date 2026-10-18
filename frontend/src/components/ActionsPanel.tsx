// Actions: create tasks linked to a conversation, decision or message, assign them, track status.
// The bot posts "@name was assigned" in Discord. Status changes don't ping anyone.
import { useId, useMemo, useState, type FormEvent } from 'react'
import { useWorkspace } from '../state/workspace'
import { api, channelId, errorMessage } from '../api'
import type { Task, TaskStatus } from '../types'
import Dialog from './ui/Dialog'
import Identity, { useIdentity } from './ui/Identity'
import LinkSelect, { parseLink } from './ui/LinkSelect'
import { useI18n } from '../state/i18n'

const STATUS: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
]
type Filter = 'open' | 'all' | TaskStatus

const today = () => new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local time

function NewTaskForm() {
  const ws = useWorkspace()
  const { t } = useI18n()
  const people = ws.info?.people ?? []
  const ids = { title: useId(), link: useId(), msg: useId(), who: useId(), due: useId(), error: useId() }
  const [title, setTitle] = useState('')
  const [link, setLink] = useState('')
  const [messageId, setMessageId] = useState('')
  const [assignee, setAssignee] = useState('')
  const [due, setDue] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const identity = useIdentity(people)

  const { topicId } = parseLink(link, ws.view)
  const topicMessages = useMemo(() => ws.view.messages.filter((m) => m.topic_id === topicId), [ws.view.messages, topicId])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!title.trim()) return setError('Write what needs doing.')
    if (!identity.valid) return setError('Choose your name, or post anonymously.')
    const { claimId } = parseLink(link, ws.view)
    setBusy(true)
    try {
      const res = await api.post<{ task: Task; warning: string | null }>(`/channels/${channelId}/tasks`, {
        title,
        topic_id: topicId,
        claim_id: claimId,
        message_id: messageId || null,
        assignee_id: assignee || null,
        due_date: due || null,
        created_by: identity.createdBy,
      })
      ws.setTasks((t) => [res.task, ...t])
      if (res.warning) ws.toast(res.warning, 'error')
      else ws.toast(assignee ? 'Task created and assignee notified in Discord.' : 'Task created.', 'success')
      setTitle('')
      setMessageId('')
      setAssignee('')
      setDue('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label htmlFor={ids.title} className="label">
          {t('Task')}
        </label>
        <input id={ids.title} className="field" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} data-autofocus />
      </div>
      <div>
        <label htmlFor={ids.link} className="label">
          {t('Linked to')} <span className="hint">({t('optional')})</span>
        </label>
        <LinkSelect
          id={ids.link}
          view={ws.view}
          value={link}
          onChange={(v) => {
            setLink(v)
            setMessageId('')
          }}
        />
      </div>
      {topicMessages.length > 0 && (
        <div>
          <label htmlFor={ids.msg} className="label">
            {t('Message')} <span className="hint">({t('optional, the bot replies to it')})</span>
          </label>
          <select id={ids.msg} className="field" value={messageId} onChange={(e) => setMessageId(e.target.value)}>
            <option value="">{t('No specific message')}</option>
            {topicMessages.map((m) => (
              <option key={m.id} value={m.id}>
                {m.author}: {(() => { const x = t(m.content); return x.length > 70 ? x.slice(0, 67) + '…' : x })()}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={ids.who} className="label">
            {t('Assign to')}
          </label>
          <select id={ids.who} className="field" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">{t('Unassigned')}</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={ids.due} className="label">
            {t('Due')} <span className="hint">({t('optional')})</span>
          </label>
          <input id={ids.due} type="date" className="field" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
      </div>
      <Identity people={people} value={identity} />
      {error && (
        <p id={ids.error} role="alert" className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>
          {t(error)}
        </p>
      )}
      <button type="submit" className="btn btn-primary w-full" disabled={busy}>
        {t(busy ? 'Creating…' : 'Create task')}
      </button>
    </form>
  )
}

function TaskRow({ task }: { task: Task }) {
  const ws = useWorkspace()
  const { t } = useI18n()
  const people = ws.info?.people ?? []
  const ids = { status: useId(), who: useId() }
  const [busy, setBusy] = useState(false)
  const topic = ws.view.topics.find((t) => t.id === task.topic_id)
  const claim = ws.view.claims.find((c) => c.id === task.claim_id)
  const overdue = task.due_date && task.status !== 'done' && task.due_date < today()

  const patch = async (body: Record<string, unknown>, success: string) => {
    setBusy(true)
    try {
      const res = await api.patch<{ task: Task; warning: string | null }>(`/tasks/${task.id}`, body)
      ws.setTasks((all) => all.map((t) => (t.id === task.id ? res.task : t)))
      ws.toast(res.warning ?? success, res.warning ? 'error' : 'success')
    } catch (err) {
      ws.toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await api.del(`/tasks/${task.id}`)
      ws.setTasks((all) => all.filter((t) => t.id !== task.id))
      ws.toast('Task deleted.')
    } catch (err) {
      ws.toast(errorMessage(err), 'error')
      setBusy(false)
    }
  }

  return (
    <li className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
      <h4 className={`font-semibold ${task.status === 'done' ? 'line-through opacity-75' : ''}`}>{t(task.title)}</h4>
      <p className="hint mt-0.5">
        {topic ? t(topic.title) : t('Not linked')}
        {claim ? ` · ${t(claim.kind)}: ${(() => { const x = t(claim.text); return x.length > 50 ? x.slice(0, 47) + '…' : x })()}` : ''}
        {' · '}
        {task.created_by ?? t('anonymous')}
      </p>
      {task.due_date && (
        <p className="mt-1 text-sm" style={{ color: overdue ? 'var(--danger)' : undefined }}>
          <span className={overdue ? 'font-semibold' : ''}>{t(overdue ? 'Overdue' : 'Due')}: </span>
          {task.due_date}
        </p>
      )}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={ids.status} className="label">
            {t('Status')}
          </label>
          <select
            id={ids.status}
            className="field"
            value={task.status}
            disabled={busy}
            onChange={(e) => patch({ status: e.target.value }, `${t('Marked')} ${t(STATUS.find((s) => s.value === e.target.value)?.label ?? '')}.`)}
          >
            {STATUS.map((s) => (
              <option key={s.value} value={s.value}>
                {t(s.label)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={ids.who} className="label">
            {t('Assignee')}
          </label>
          <select
            id={ids.who}
            className="field"
            value={task.assignee_id ?? ''}
            disabled={busy}
            onChange={(e) =>
              patch({ assignee_id: e.target.value || null }, e.target.value ? 'Reassigned and notified in Discord.' : 'Unassigned.')
            }
          >
            <option value="">{t('Unassigned')}</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>
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
        {task.discord_url && (
          <button type="button" className="btn btn-ghost" onClick={() => ws.confirmLeave(task.discord_url!)}>
            {t('View in Discord')}
          </button>
        )}
        <button type="button" className="btn btn-ghost" style={{ color: 'var(--danger)' }} disabled={busy} onClick={remove} aria-label={`${t('Delete task')}: ${t(task.title)}`}>
          {t('Delete')}
        </button>
      </div>
    </li>
  )
}

export default function ActionsPanel() {
  const ws = useWorkspace()
  const { t } = useI18n()
  const filterId = useId()
  const [filter, setFilter] = useState<Filter>('open')
  const shown = ws.tasks.filter((t) =>
    filter === 'all' ? true : filter === 'open' ? t.status !== 'done' : t.status === filter,
  )
  return (
    <Dialog
      open={ws.panel === 'actions'}
      onClose={() => ws.openPanel(null)}
      title="Actions"
      description="Turn decisions into tasks. Assigning someone pings them in Discord."
    >
      {!ws.backend ? (
        <p className="text-sm">
          {t("Actions need the Accord backend. Run /accord in Discord and open the map from the bot's link.")}
        </p>
      ) : (
        <div className="space-y-8">
          <section aria-labelledby="new-task">
            <h3 id="new-task" className="mb-3 font-bold">
              {t('New task')}
            </h3>
            <NewTaskForm />
          </section>
          <section aria-labelledby="task-list">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 id="task-list" className="font-bold">
                {t('Tasks')} <span className="hint">({shown.length})</span>
              </h3>
              <div className="flex items-center gap-2">
                <label htmlFor={filterId} className="text-sm font-semibold">
                  {t('Show')}
                </label>
                <select id={filterId} className="field !w-auto" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
                  <option value="open">{t('Not done')}</option>
                  <option value="all">{t('All')}</option>
                  {STATUS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {t(s.label)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {shown.length === 0 ? (
              <p className="hint">{t('No tasks here.')}</p>
            ) : (
              <ul className="space-y-3" aria-live="polite">
                {shown.map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Dialog>
  )
}
