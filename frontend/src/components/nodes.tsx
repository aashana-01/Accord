// The three kinds of boxes on the map: the logo (center), a conversation (topic), and a group of points inside a topic.
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import type { Claim, ClaimKind, Message, Topic } from '../types'
import { activityColor, brand, chipLabel, claimColor, kindColor, meaning, statusColor } from '../theme'
import logo from '../assets/accord-logo.png'
import { useI18n } from '../state/i18n'

// Invisible connection points; the arrows work out their own start and end (see FloatingEdge.tsx).
const hidden = { top: '50%', left: '50%', opacity: 0, pointerEvents: 'none' as const }

function Handles() {
  return (
    <>
      <Handle type="target" position={Position.Top} style={hidden} isConnectable={false} />
      <Handle type="source" position={Position.Top} style={hidden} isConnectable={false} />
    </>
  )
}

// Labeled chip, e.g. "Status: Debating". Hover shows what the value means.
export function Chip({ label, value, color }: { label?: string; value: string; color: string }) {
  const { t } = useI18n()
  return (
    <span
      title={meaning[value] ? t(meaning[value]) : undefined}
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px]"
      style={{ borderColor: color, backgroundColor: `${color}1F`, color: brand.text }}
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      {label && <span style={{ color: brand.textMuted }}>{t(label)}:</span>}
      <span className="font-semibold">{t(value.charAt(0).toUpperCase() + value.slice(1))}</span>
    </span>
  )
}

// ---------- Wheel (decoration behind the center: "Reinvent the Wheel") ----------
export type WheelNodeType = Node<Record<string, never>, 'wheel'>

export function WheelNode() {
  const c = brand.wheel
  const spokes = Array.from({ length: 12 }, (_, i) => (i * Math.PI) / 6)
  return (
    <svg width="900" height="900" viewBox="-450 -450 900 900" className="wheel-spin pointer-events-none" aria-hidden>
      <circle r="440" fill="none" stroke={c} strokeWidth="2" strokeDasharray="4 10" />
      <circle r="380" fill="none" stroke={c} strokeWidth="10" />
      <circle r="250" fill="none" stroke={c} strokeWidth="2" />
      <circle r="110" fill="none" stroke={c} strokeWidth="6" />
      {spokes.map((a) => (
        <line key={a} x1={Math.cos(a) * 110} y1={Math.sin(a) * 110} x2={Math.cos(a) * 380} y2={Math.sin(a) * 380} stroke={c} strokeWidth="3" />
      ))}
    </svg>
  )
}

// ---------- Logo (center) ----------
export type LogoNodeType = Node<{ name: string }, 'logo'>

export function LogoNode({ data }: NodeProps<LogoNodeType>) {
  return (
    <div
      className="node-enter flex h-36 w-36 items-center justify-center rounded-md shadow-xl"
      style={{ backgroundColor: brand.logoCard }}
      title={`#${data.name}`}
    >
      <img src={logo} alt="Accord" className="h-32 w-32 select-none" draggable={false} />
      <Handles />
    </div>
  )
}

// ---------- Conversation (topic) ----------
export type TopicNodeType = Node<
  { topic: Topic; focused: boolean; proposals: Claim[]; onOpen: () => void; taskCount: number; pollCount: number },
  'topic'
>

export function TopicNode({ data }: NodeProps<TopicNodeType>) {
  const { topic, focused, proposals, onOpen, taskCount, pollCount } = data
  const { t } = useI18n()
  const count = topic.message_ids.length
  const dormant = topic.activity === 'dormant' && !focused
  const type = topic.is_off_topic ? 'off-topic' : topic.kind
  const extras = [
    `${count} ${t(count === 1 ? 'message' : 'messages')}`,
    taskCount ? `${taskCount} ${t(taskCount === 1 ? 'task' : 'tasks')}` : '',
    pollCount ? `${pollCount} ${t(pollCount === 1 ? 'poll' : 'polls')}` : '',
  ].filter(Boolean)
  // One spoken sentence for screen readers, since the box itself is a button.
  const spoken = `${t(topic.title)}. ${t('Activity')} ${t(topic.activity)}${topic.is_off_topic ? '' : `, ${t('Status')} ${t(topic.status)}`}, ${t('Type')} ${t(type)}, ${extras.join(', ')}.`

  return (
    <div
      className={`node-enter relative rounded-2xl p-4 text-left shadow-lg ${focused ? 'w-80' : 'w-60 hover:brightness-105'}`}
      style={{
        backgroundColor: dormant ? brand.cardDormant : brand.card,
        color: brand.text,
        border: focused ? `3px solid ${brand.wine}` : `1px solid ${brand.cardBorder}`,
      }}
    >
      <div aria-hidden>
        <div className="text-base leading-tight font-bold">{t(topic.title)}</div>
        <div className="mt-2 flex flex-col items-start gap-1">
          <Chip label={chipLabel.activity} value={topic.activity} color={activityColor[topic.activity]} />
          {!topic.is_off_topic && <Chip label={chipLabel.status} value={topic.status} color={statusColor[topic.status]} />}
          <Chip label={chipLabel.kind} value={type} color={kindColor[type]} />
        </div>
        <div className="mt-2 text-[11px]" style={{ color: brand.textMuted }}>
          {extras.join(' · ')}
        </div>
      </div>

      {/* In an argument, the proposal being argued sits inside the center box */}
      {focused && proposals.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t pt-2" style={{ borderColor: `${brand.wine}33` }}>
          {proposals.map((p) => (
            <div key={p.id} className="text-sm">
              <Chip value="proposal" color={claimColor.proposal} /> <span>{t(p.text)}</span>
            </div>
          ))}
        </div>
      )}

      {/* The whole box is one keyboard-reachable button: Enter opens it, or goes back when it's the open one */}
      <button
        type="button"
        onClick={onOpen}
        className={`nodrag absolute inset-0 rounded-2xl ${focused ? 'cursor-zoom-out' : 'cursor-pointer'}`}
        aria-label={focused ? `${spoken} ${t('Back to all conversations.')}` : `${spoken} ${t('Open conversation.')}`}
      />
      <Handles />
    </div>
  )
}

// ---------- Group of points inside a topic ----------
export interface PointItem {
  id: string
  text: string
  answer?: string
  notSure?: boolean // low AI confidence
  fromPoll?: boolean // a Discord poll's winner
  replaced?: { id: string; text: string }[] // older decisions this one replaced
  evidence: Message[] // source messages, shown as quotes
}

export type PointsNodeType = Node<
  { title: string; kind: ClaimKind; chip?: string; color?: string; items: PointItem[]; empty?: string },
  'points'
>

export function PointsNode({ data }: NodeProps<PointsNodeType>) {
  const color = data.color ?? claimColor[data.kind]
  const { t } = useI18n()

  return (
    <div
      className="node-enter w-64 cursor-default rounded-2xl border-2 p-3 text-left shadow-lg"
      style={{ backgroundColor: brand.card, color: brand.text, borderColor: color }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold">{t(data.title)}</span>
        <Chip value={data.chip ?? data.kind} color={color} />
      </div>

      {data.items.length === 0 ? (
        <div className="mt-2 text-sm italic" style={{ color: brand.textMuted }}>
          {data.empty ? t(data.empty) : null}
        </div>
      ) : (
        <ul className="mt-2 space-y-2">
          {data.items.map((item) => (
            <li key={item.id}>
              <div className="text-sm">
                {t(item.text)}
                {item.fromPoll && (
                  <span className="ml-1.5 align-middle">
                    <Chip value="decided by poll" color="#16A34A" />
                  </span>
                )}
                {item.notSure && (
                  <span className="ml-1.5 align-middle">
                    <Chip value="not sure" color="#B45309" />
                  </span>
                )}
              </div>
              {item.replaced?.map((old) => (
                <div key={old.id} className="mt-0.5 text-xs" style={{ color: brand.textMuted }}>
                  {t('Replaced')}: <span className="line-through">{t(old.text)}</span>
                </div>
              ))}
              {item.answer && (
                <div className="mt-0.5 text-sm">
                  <span className="font-semibold" style={{ color: claimColor.decision }}>
                    {t('Answer')}:
                  </span>{' '}
                  {t(item.answer)}
                </div>
              )}
              {item.evidence.map((m) => (
                <div key={m.id} className="mt-0.5 truncate text-[11px] italic" style={{ color: brand.textMuted }} title={t(m.content)}>
                  ↳ {m.author}: "{t(m.content)}"
                </div>
              ))}
            </li>
          ))}
        </ul>
      )}
      <Handles />
    </div>
  )
}
