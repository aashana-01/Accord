// Fake chat to build against until the backend is ready.
import type { Claim, Message, Topic } from '../types'

const base = new Date('2026-10-16T19:00:00-06:00').getTime()

// [minutes after start, author, text, replies to, topic]
const raw: [number, string, string, string | null, string][] = [
  [0, 'Pearl', 'ok so what are we calling this thing', null, 'name'],
  [1, 'Shriya', 'anyone playing valorant after this lol', null, 'off'],
  [2, 'Aashana', 'ThreadSense? since it makes sense of threads', 'm1', 'name'],
  [3, 'Pearl', "for the stack I'm thinking React + TS on the frontend", null, 'stack'],
  [4, 'Shriya', 'ThreadSense sounds like a sewing app tbh', 'm3', 'name'],
  [5, 'Aashana', 'FastAPI for backend, python makes clustering easier', 'm4', 'stack'],
  [6, 'Shriya', 'should we use an AI API for the extraction part?', null, 'ai'],
  [7, 'Pearl', 'what about Accord? like reaching an accord', 'm1', 'name'],
  [8, 'Aashana', 'ooh Accord is good', 'm8', 'name'],
  [10, 'Pearl', 'AI would be way faster than writing rules', 'm7', 'ai'],
  [11, 'Aashana', 'but it costs money and outputs change every run', 'm7', 'ai'],
  [12, 'Shriya', 'valorant at 11 then?', 'm2', 'off'],
  [13, 'Pearl', 'ok locking it in: the name is Accord. everyone agree?', null, 'name'],
  [14, 'Aashana', 'agreed 👍', 'm13', 'name'],
  [15, 'Shriya', 'agreed', 'm13', 'name'],
  [18, 'Shriya', 'deterministic first, AI on top, so it still works offline', 'm7', 'ai'],
  [20, 'Pearl', 'when are we launching the demo build? need a date', null, 'date'],
  [30, 'Aashana', 'ok stack: React+TS front, FastAPI back', null, 'stack'],
  [31, 'Pearl', 'works for me', 'm18', 'stack'],
  [180, 'Aashana', 'wait, should the bot run in the same process as FastAPI?', 'm18', 'stack'],
  [182, 'Pearl', 'yeah, one process is simpler', 'm20', 'stack'],
  [185, 'Shriya', 'still need to compare accuracy before we commit to AI', 'm16', 'ai'],
  [186, 'Pearl', "what's the API cost per 1k messages?", 'm11', 'ai'],
  [9, 'Aashana', "ok let's just do Node for the backend then", 'm4', 'stack'],
]

export const channel = { name: 'planning' }

export const messages: Message[] = raw.map(([min, author, content, reply, topic], i) => ({
  id: `m${i + 1}`,
  author,
  timestamp: new Date(base + min * 60_000).toISOString(),
  content,
  reply_to: reply,
  topic_id: `t-${topic}`,
}))

const idsFor = (topicId: string) =>
  messages.filter((m) => m.topic_id === topicId).map((m) => m.id)

export const topics: Topic[] = [
  { id: 't-name', title: 'Project name', status: 'decided', activity: 'dormant', kind: 'discussion', message_ids: idsFor('t-name'), is_off_topic: false },
  { id: 't-stack', title: 'Tech stack', status: 'decided', activity: 'reopened', kind: 'discussion', message_ids: idsFor('t-stack'), is_off_topic: false },
  { id: 't-ai', title: 'AI API', status: 'debating', activity: 'active', kind: 'argument', message_ids: idsFor('t-ai'), is_off_topic: false },
  { id: 't-date', title: 'Launch date', status: 'open', activity: 'dormant', kind: 'discussion', message_ids: idsFor('t-date'), is_off_topic: false },
  { id: 't-off', title: 'Valorant tonight', status: 'open', activity: 'dormant', kind: 'discussion', message_ids: idsFor('t-off'), is_off_topic: true },
]

export const claims: Claim[] = [
  // Project name (discussion)
  { id: 'c1', topic_id: 't-name', kind: 'proposal', text: 'Call it ThreadSense', source_ids: ['m3'] },
  { id: 'c2', topic_id: 't-name', kind: 'against', text: 'ThreadSense sounds like a sewing app', source_ids: ['m5'] },
  { id: 'c3', topic_id: 't-name', kind: 'proposal', text: 'Call it Accord', source_ids: ['m8', 'm9'] },
  { id: 'c4', topic_id: 't-name', kind: 'decision', text: 'Name is Accord, all three agreed', source_ids: ['m13', 'm14', 'm15'] },
  // Tech stack (discussion)
  { id: 'c5', topic_id: 't-stack', kind: 'proposal', text: 'React + TS front, FastAPI back', source_ids: ['m4', 'm6'] },
  { id: 'c6', topic_id: 't-stack', kind: 'decision', text: 'React + TS front, FastAPI back', source_ids: ['m18', 'm19'] },
  { id: 'c7', topic_id: 't-stack', kind: 'question', text: 'Should the bot run in the same process as FastAPI?', source_ids: ['m20'], answer: 'Yes, one process is simpler', answer_source_ids: ['m21'] },
  { id: 'c15', topic_id: 't-stack', kind: 'decision', text: 'Use Node for the backend', source_ids: ['m24'], superseded_by: 'c6' },
  // AI API (argument)
  { id: 'c8', topic_id: 't-ai', kind: 'proposal', text: 'Use an AI API for extraction', source_ids: ['m7'] },
  { id: 'c9', topic_id: 't-ai', kind: 'for', text: 'Faster than writing rules', source_ids: ['m10'], confidence: 55 },
  { id: 'c10', topic_id: 't-ai', kind: 'against', text: 'Costs money, outputs change every run', source_ids: ['m11'] },
  { id: 'c11', topic_id: 't-ai', kind: 'for', text: 'Deterministic first, AI on top, still works offline', source_ids: ['m16'] },
  { id: 'c12', topic_id: 't-ai', kind: 'question', text: 'How accurate is it compared to rules?', source_ids: ['m22'] },
  { id: 'c13', topic_id: 't-ai', kind: 'question', text: "What's the API cost per 1k messages?", source_ids: ['m23'] },
  // Launch date (discussion)
  { id: 'c14', topic_id: 't-date', kind: 'question', text: 'When do we launch the demo build?', source_ids: ['m17'] },
]
