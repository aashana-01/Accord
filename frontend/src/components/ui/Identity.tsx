// "Post anonymously, or as…" — asked whenever someone creates a poll or task. Remembered for next time.
import { useEffect, useId, useState } from 'react'
import type { Person } from '../../types'
import { useI18n } from '../../state/i18n'

const KEY = 'accord-identity'

export function useIdentity(people: Person[]) {
  const [anonymous, setAnonymous] = useState(true)
  const [personId, setPersonId] = useState('')
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null')
      if (saved && typeof saved.anonymous === 'boolean') {
        setAnonymous(saved.anonymous)
        setPersonId(saved.personId ?? '')
      }
    } catch {
      /* first visit or storage blocked */
    }
  }, [])
  const save = (a: boolean, p: string) => {
    setAnonymous(a)
    setPersonId(p)
    try {
      localStorage.setItem(KEY, JSON.stringify({ anonymous: a, personId: p }))
    } catch {
      /* ignore */
    }
  }
  const person = people.find((p) => p.id === personId)
  return { anonymous, personId, save, createdBy: anonymous ? null : (person?.name ?? null), valid: anonymous || !!person }
}

export default function Identity({ people, value }: { people: Person[]; value: ReturnType<typeof useIdentity> }) {
  const id = useId()
  const { t } = useI18n()
  return (
    <fieldset className="rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
      <legend className="label px-1">{t('Post as')}</legend>
      <div className="flex flex-col gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="radio" name={id} checked={value.anonymous} onChange={() => value.save(true, value.personId)} />
          {t('Anonymous')}
        </label>
        <label className="flex flex-wrap items-center gap-2">
          <input type="radio" name={id} checked={!value.anonymous} onChange={() => value.save(false, value.personId)} />
          {t('Me')}:
          <select
            className="field !w-auto min-w-40 flex-1"
            aria-label={t('Your name')}
            value={value.personId}
            disabled={value.anonymous}
            onChange={(e) => value.save(false, e.target.value)}
          >
            <option value="">{t('Choose your name…')}</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </fieldset>
  )
}
