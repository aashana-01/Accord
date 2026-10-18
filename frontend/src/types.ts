// Shapes of the data we get from the backend (Aashana's models.py must match these).

export type TopicStatus = 'decided' | 'debating' | 'open' // what the group concluded
export type TopicActivity = 'active' | 'dormant' | 'reopened' // what happened over time
export type TopicKind = 'argument' | 'discussion' // decides how a branch expands
export type ClaimKind = 'proposal' | 'for' | 'against' | 'decision' | 'question'

export interface Message {
  id: string
  author: string
  timestamp: string
  content: string
  reply_to: string | null
  topic_id: string
}

export interface Topic {
  id: string
  title: string
  status: TopicStatus
  activity: TopicActivity
  kind: TopicKind
  message_ids: string[]
  is_off_topic: boolean
}

export interface Claim {
  id: string
  topic_id: string
  kind: ClaimKind
  text: string
  source_ids: string[] // the messages that prove this claim
  answer?: string // questions only: filled in once someone answers
  answer_source_ids?: string[]
  confidence?: number // 0-100 from the AI review; low = shown as "Not sure"
  superseded_by?: string | null // a decision replaced by a newer decision points at it
  origin?: 'ai' | 'poll' // 'poll' = the winner of a Discord poll
}

// Everything the mind map needs for one channel (GET /channels/{id}/view)
export interface ChannelView {
  channel: { id?: string; name: string; guild?: string; guild_id?: string | null }
  messages: Message[]
  topics: Topic[]
  claims: Claim[]
}

export interface Person {
  id: string
  name: string
}

export interface ChannelInfo {
  channel_id: string
  channel_name: string
  guild_id: string | null
  guild_name: string
  people: Person[]
}

export interface PollResult {
  text: string
  votes: number
}

export interface Poll {
  id: string
  topic_id: string | null
  claim_id: string | null
  question: string
  options: string[]
  duration_hours: number
  allow_multiselect: boolean
  created_by: string | null
  status: 'open' | 'closed'
  results: PollResult[]
  decision_claim_id: string | null
  discord_url: string | null
  created_at: string
}

export type TaskStatus = 'todo' | 'in_progress' | 'done'

export interface Task {
  id: string
  topic_id: string | null
  claim_id: string | null
  message_id: string | null
  title: string
  assignee_id: string | null
  assignee_name: string | null
  created_by: string | null
  status: TaskStatus
  due_date: string | null
  discord_url: string | null
  created_at: string
  updated_at: string
}
