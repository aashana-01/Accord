// Works out where every box goes, for the overview and for a zoomed-in topic.
import { MarkerType, type Edge, type Node } from '@xyflow/react'
import type { Claim, ClaimKind, Message, Topic } from './types'
import type { PointItem, PointsNodeType } from './components/nodes'
import { brand, claimColor } from './theme'

// Dashed white arrow pointing outward, like the mockup
function arrow(id: string, source: string, target: string): Edge {
  return {
    id,
    source,
    target,
    type: 'floating',
    style: { stroke: brand.branch, strokeWidth: 2, strokeDasharray: '6 6' },
    markerEnd: { type: MarkerType.ArrowClosed, color: brand.branch, width: 18, height: 18 },
  }
}

// Two columns on either side of the logo (left gets the extra one when the count is odd).
function columns(count: number) {
  const leftCount = Math.ceil(count / 2)
  const place = (n: number, x: number) =>
    Array.from({ length: n }, (_, i) => ({ x, y: (i - (n - 1) / 2) * 200 }))
  return [...place(leftCount, -340), ...place(count - leftCount, 340)]
}

// Spread `count` points evenly around an oval (wider than tall), starting at the top.
function ring(count: number, rx: number, ry: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 2 * Math.PI - Math.PI / 2
    return { x: Math.cos(angle) * rx, y: Math.sin(angle) * ry }
  })
}

// The faint wheel always sits behind whatever is in the center
const wheel: Node = { id: 'wheel', type: 'wheel', position: { x: 0, y: 0 }, data: {}, zIndex: -1, selectable: false, focusable: false }

// Overview: logo in the middle, conversations in two columns around it.
export function overviewLayout(channelName: string, topics: Topic[]) {
  const spots = columns(topics.length)

  const nodes: Node[] = [
    wheel,
    { id: 'logo', type: 'logo', position: { x: 0, y: 0 }, data: { name: channelName } },
    ...topics.map((topic, i) => ({
      id: topic.id,
      type: 'topic',
      position: spots[i],
      data: { topic, focused: false, proposals: [] },
    })),
  ]

  const edges: Edge[] = topics.map((topic) => arrow(`e-${topic.id}`, 'logo', topic.id))

  return { nodes, edges }
}

const singleTitle: Record<ClaimKind, string> = {
  proposal: 'Proposal',
  for: 'Point for',
  against: 'Point against',
  decision: 'Decision',
  question: 'Question',
}

// Zoomed in: the topic moves to the middle, its points branch out around it.
export function focusLayout(topic: Topic, allClaims: Claim[], messages: Message[]) {
  const byId = new Map(messages.map((m) => [m.id, m]))
  const evidence = (ids: string[]) =>
    ids.map((id) => byId.get(id)).filter((m): m is Message => m !== undefined)
  const toItem = (c: Claim): PointItem => ({
    id: c.id,
    text: c.text,
    answer: c.answer,
    evidence: evidence([...c.source_ids, ...(c.answer_source_ids ?? [])]),
  })

  const claims = allClaims.filter((c) => c.topic_id === topic.id)
  const ofKind = (kind: ClaimKind) => claims.filter((c) => c.kind === kind)
  const openQuestions = ofKind('question').filter((c) => !c.answer)
  const answered = ofKind('question').filter((c) => c.answer)

  type GroupData = PointsNodeType['data']
  const groups: GroupData[] = []

  if (topic.kind === 'argument') {
    // Always the same 3 boxes; Decision first so it sits on top
    groups.push({ title: 'Decision', kind: 'decision', items: ofKind('decision').map(toItem), empty: 'No decision yet' })
    groups.push({ title: 'Against', kind: 'against', items: ofKind('against').map(toItem), empty: 'No objections raised' })
    groups.push({ title: 'For', kind: 'for', items: ofKind('for').map(toItem), empty: 'No supporting points yet' })
  } else {
    // A discussion gets one branch per point
    for (const c of claims.filter((c) => c.kind !== 'question')) {
      groups.push({ title: singleTitle[c.kind], kind: c.kind, items: [toItem(c)] })
    }
  }

  // Answered questions move out into their own branch
  for (const q of answered) {
    groups.push({ title: 'Answered question', kind: 'question', chip: 'answered', color: claimColor.decision, items: [toItem(q)] })
  }
  // All unanswered questions are clustered into one box
  if (openQuestions.length > 0) {
    groups.push({ title: 'Open questions', kind: 'question', items: openQuestions.map(toItem) })
  }
  if (groups.length === 0) {
    groups.push(
      topic.is_off_topic
        ? { title: 'Just chatting', kind: 'question', chip: 'off-topic', color: '#6B7280', items: [], empty: 'Nothing to decide here' }
        : { title: 'Nothing to map yet', kind: 'question', items: [], empty: 'No proposals or questions found' },
    )
  }

  const spots = ring(groups.length, Math.max(430, groups.length * 95), Math.max(320, groups.length * 70))
  const proposals = topic.kind === 'argument' ? ofKind('proposal') : []

  const nodes: Node[] = [
    wheel,
    { id: topic.id, type: 'topic', position: { x: 0, y: 0 }, data: { topic, focused: true, proposals } },
    ...groups.map((data, i) => ({ id: `${topic.id}-g${i}`, type: 'points', position: spots[i], data })),
  ]

  const edges: Edge[] = groups.map((_, i) => arrow(`f-${topic.id}-${i}`, topic.id, `${topic.id}-g${i}`))

  return { nodes, edges }
}
