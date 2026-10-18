// Picks what a poll/task is about: a conversation, or one of its decisions/points/questions.
import type { ChannelView } from '../../types'
import { useI18n } from '../../state/i18n'

export type LinkValue = { topicId: string | null; claimId: string | null }

export const parseLink = (value: string, view: ChannelView): LinkValue => {
  if (value.startsWith('claim:')) {
    const claim = view.claims.find((c) => c.id === value.slice(6))
    return { topicId: claim?.topic_id ?? null, claimId: claim?.id ?? null }
  }
  if (value.startsWith('topic:')) return { topicId: value.slice(6), claimId: null }
  return { topicId: null, claimId: null }
}

const kindLabel: Record<string, string> = {
  decision: 'Decision', proposal: 'Proposal', for: 'For', against: 'Against', question: 'Question',
}

interface Props {
  id: string
  view: ChannelView
  value: string
  onChange: (value: string) => void
  required?: boolean
  includeOffTopic?: boolean
}

export default function LinkSelect({ id, view, value, onChange, required, includeOffTopic }: Props) {
  const { t } = useI18n()
  return (
    <select id={id} className="field" value={value} onChange={(e) => onChange(e.target.value)} required={required}>
      <option value="">{t(required ? 'Choose a conversation or decision…' : 'Not linked')}</option>
      {view.topics
        .filter((t) => includeOffTopic || !t.is_off_topic)
        .map((topic) => (
          <optgroup key={topic.id} label={t(topic.title)}>
            <option value={`topic:${topic.id}`}>{t('Whole conversation')}: {t(topic.title)}</option>
            {view.claims
              .filter((c) => c.topic_id === topic.id && !c.superseded_by)
              .map((c) => (
                <option key={c.id} value={`claim:${c.id}`}>
                  {t(kindLabel[c.kind])}: {(() => { const x = t(c.text); return x.length > 70 ? `${x.slice(0, 67)}…` : x })()}
                </option>
              ))}
          </optgroup>
        ))}
    </select>
  )
}
